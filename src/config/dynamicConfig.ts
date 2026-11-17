import type { DynamicConfig } from "@/types/dynamicConfig";

export const dynamicConfig: DynamicConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 动态头像和名称的跳转地址，支持站内路径或完整 URL
	profileUrl: "/about/",

	// 是否为每条动态启用评论，需要先在 commentConfig.ts 启用评论系统
	showComment: true,

	// 每页显示的动态数量
	itemsPerPage: 10,

	// 动态数据 json 地址，本地默认 "/api/dynamic.json"
	// 可改为第三方接口地址，如 "https://firefly.cuteleaf.cn/api/dynamic.json"
	// 数据结构可打开上方链接地址参考
	// memos.enable 为 true 时忽略这里
	// localPosts.enable 为 true 时，这里的动态会和小肥鱼的动态一起显示
	apiUrl: "/api/dynamic.json",

	// ========== Memos 配置 ==========
	// 启用后客户端会直接从 Memos API 实时获取数据，apiUrl 配置将被忽略
	// Memos 记得配置 CORS，否则可能会出现跨域问题
	memos: {
		// 是否启用 Memos 数据源
		enable: false,

		// Memos 实例地址
		apiUrl: "https://memos.example.com",

		// Memos 用户标识，如 "users/你的memos用户名"，用于过滤指定用户的动态
		parent: "users/xiaye",
	},

	// ========== 小肥鱼动态 ==========
	// 启用后和上面的动态一起显示，作者名和头像单独区分
	// 清单 GET {apiUrl}/posts，正文 GET {apiUrl}/posts/{file}
	// 线上走站点自己的 /fish/，由 Nginx 转到本机 6201。本地调试可改回 http://127.0.0.1:6201
	localPosts: {
		enable: true,
		apiUrl: "/fish",
		name: "今天也没被做成鱼罐头",
		avatar: "/assets/images/fish-avatar.jpg",
		profileUrl: "/about/fish/",
	},
};
