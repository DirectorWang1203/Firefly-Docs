/**
 * 小肥鱼本地动态接口适配器
 * 清单接口只有摘要，正文需要再按文件名拉取，再转成动态页使用的结构
 */

import { fetchWithDedup } from "@/utils/fetch-dedup";
import type { DynamicEntry, DynamicImage } from "@/utils/memos-adapter";

interface LocalPostSummary {
	date: string;
	file: string;
	title: string;
	published: string;
}

interface LocalPostDetail extends LocalPostSummary {
	markdown?: string;
}

interface LocalPostsResponse {
	posts?: LocalPostSummary[];
}

const pendingRequests = new Map<string, Promise<DynamicEntry[]>>();

function imagePattern(): RegExp {
	return /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g;
}

function joinUrl(base: string, path: string): string {
	return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function resolveSrc(src: string, apiUrl: string): string {
	if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
	return joinUrl(apiUrl, src);
}

function extractImages(markdown: string, apiUrl: string): DynamicImage[] {
	const images: DynamicImage[] = [];
	for (const match of markdown.matchAll(imagePattern())) {
		images.push({
			alt: match[1] || "",
			src: resolveSrc(match[2], apiUrl),
			...(match[3] ? { title: match[3] } : {}),
		});
	}
	return images;
}

function extractPlainText(content: string): string {
	return content
		.replace(imagePattern(), " ")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/<[^>]+>/g, " ")
		.replace(/[#>*_`~[\]()-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function formatInline(text: string): string {
	return text
		.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
		)
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function markdownToHtml(markdown: string): string {
	const lines = escapeHtml(markdown.replace(/\r\n?/g, "\n")).split("\n");
	const blocks: string[] = [];
	let paragraph: string[] = [];
	let list: string[] = [];

	const flushParagraph = () => {
		if (paragraph.length === 0) return;
		blocks.push(`<p>${paragraph.join("<br>")}</p>`);
		paragraph = [];
	};
	const flushList = () => {
		if (list.length === 0) return;
		blocks.push(`<ul>\n${list.join("\n")}\n</ul>`);
		list = [];
	};

	for (const line of lines) {
		const task = line.match(/^[ \t]*[-*] \[([ xX])\] (.+)$/);
		const item = line.match(/^[ \t]*[-*] (.+)$/);
		const heading = line.match(/^(#{1,3}) (.+)$/);
		const quote = line.match(/^&gt;(?: |$)(.*)$/);
		const trimmed = line.trim();
		if (trimmed === "") {
			flushParagraph();
			flushList();
			continue;
		}
		if (trimmed === "---") {
			flushParagraph();
			flushList();
			blocks.push("<hr>");
			continue;
		}
		if (task) {
			flushParagraph();
			const checked = task[1].toLowerCase() === "x" ? " checked" : "";
			list.push(
				`<li><input type="checkbox"${checked} disabled> ${formatInline(task[2])}</li>`,
			);
			continue;
		}
		if (item) {
			flushParagraph();
			list.push(`<li>${formatInline(item[1])}</li>`);
			continue;
		}
		if (heading) {
			flushParagraph();
			flushList();
			const level = heading[1].length;
			blocks.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
			continue;
		}
		if (quote) {
			flushParagraph();
			flushList();
			blocks.push(`<blockquote>${formatInline(quote[1])}</blockquote>`);
			continue;
		}
		flushList();
		paragraph.push(formatInline(line));
	}
	flushParagraph();
	flushList();
	return blocks.join("\n");
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url, {
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`Local posts API error: ${response.status}`);
	}
	return (await response.json()) as T;
}

function sortEntries(entries: DynamicEntry[]): DynamicEntry[] {
	return entries.sort((a, b) => {
		if (a.pinned && !b.pinned) return -1;
		if (!a.pinned && b.pinned) return 1;
		return b.published - a.published;
	});
}

async function fetchLocalPostsInternal(
	apiUrl: string,
	authorName: string,
	authorAvatar?: string,
): Promise<DynamicEntry[]> {
	const list = await fetchJson<LocalPostsResponse>(joinUrl(apiUrl, "posts"));
	const summaries = list.posts ?? [];
	const details = await Promise.all(
		summaries.map((summary) =>
			fetchJson<LocalPostDetail>(
				joinUrl(apiUrl, `posts/${encodeURIComponent(summary.file)}`),
			),
		),
	);

	return sortEntries(
		details.map((post) => {
			const markdown = post.markdown || "";
			const title = post.title?.trim() || "";
			const images = extractImages(markdown, apiUrl);
			const bodyHtml = markdownToHtml(markdown.replace(imagePattern(), ""));
			const html = title
				? `<h3>${escapeHtml(title)}</h3>\n${bodyHtml}`
				: bodyHtml;
			const published = new Date(post.published).getTime();
			const id = post.file.replace(/\.md$/i, "");
			const searchText = [authorName, title, extractPlainText(markdown)]
				.filter(Boolean)
				.join(" ")
				.toLocaleLowerCase();

			return {
				id: `fish-${id}`,
				published: Number.isNaN(published) ? 0 : published,
				html,
				images,
				searchText,
				author: {
					name: authorName,
					...(authorAvatar ? { avatar: authorAvatar } : {}),
					kind: "fish" as const,
				},
				externalTime: true,
			};
		}),
	);
}

/** 拉取全部本地动态。同页面里动态页和侧边栏会共用这一次请求。 */
export async function fetchLocalPosts(
	apiUrl: string,
	authorName = "今天也没被做成鱼罐头",
	authorAvatar?: string,
): Promise<DynamicEntry[]> {
	const cacheKey = `${apiUrl}:${authorName}:${authorAvatar || ""}`;
	const pending = pendingRequests.get(cacheKey);
	if (pending) return pending;

	const promise = fetchLocalPostsInternal(apiUrl, authorName, authorAvatar);
	pendingRequests.set(cacheKey, promise);
	promise.finally(() => pendingRequests.delete(cacheKey));
	return promise;
}

/** 站长动态和小肥鱼动态合并。一边失败时仍显示另一边。 */
export async function fetchSiteAndLocalPosts(
	siteUrl: string,
	localApiUrl: string,
	authorName = "今天也没被做成鱼罐头",
	authorAvatar?: string,
): Promise<DynamicEntry[]> {
	const cacheKey = `merged:${siteUrl}|${localApiUrl}:${authorName}:${authorAvatar || ""}`;
	const pending = pendingRequests.get(cacheKey);
	if (pending) return pending;

	const promise = (async () => {
		const [siteResult, fishResult] = await Promise.allSettled([
			fetchWithDedup<DynamicEntry[]>(siteUrl),
			fetchLocalPosts(localApiUrl, authorName, authorAvatar),
		]);
		if (siteResult.status === "rejected" && fishResult.status === "rejected") {
			throw siteResult.reason;
		}
		if (siteResult.status === "rejected") {
			console.warn("Failed to load site dynamics", siteResult.reason);
		}
		if (fishResult.status === "rejected") {
			console.warn("Failed to load fish dynamics", fishResult.reason);
		}
		const site = siteResult.status === "fulfilled" ? siteResult.value : [];
		const fish = fishResult.status === "fulfilled" ? fishResult.value : [];
		return sortEntries([...site, ...fish]);
	})();
	pendingRequests.set(cacheKey, promise);
	promise.finally(() => pendingRequests.delete(cacheKey));
	return promise;
}
