export type DynamicConfig = {
	title?: string;
	description?: string;
	/** 动态头像和名称的跳转地址，支持站内路径或完整 URL */
	profileUrl?: string;
	showComment?: boolean;
	itemsPerPage?: number;
	// 动态数据 json 地址，本地默认 "/api/dynamic.json"
	// 可改为第三方接口地址，如 "https://firefly.cuteleaf.cn/api/dynamic.json"
	// 数据结构可打开上方链接地址参考
	// 当 memos.enable 为 true 时，此配置会被忽略
	// localPosts.enable 为 true 时，本地接口会和这里的动态合并显示
	apiUrl?: string;
	// Memos 配置
	memos?: DynamicMemocsConfig;
	// 小肥鱼本地动态。启用后与 apiUrl 的动态一起显示
	localPosts?: DynamicLocalPostsConfig;
};

export type DynamicLocalPostsConfig = {
	/** 是否启用本地动态接口 */
	enable: boolean;
	/** 服务根地址，如 "http://127.0.0.1:6201" */
	apiUrl: string;
	/** 这些动态的作者名，用来和站长动态区分 */
	name?: string;
	/** 作者头像，public 路径或完整 URL */
	avatar?: string;
	/** 点击头像和名字时跳转的关于页 */
	profileUrl?: string;
};

export type DynamicMemocsConfig = {
	/** 是否启用 Memos 数据源 */
	enable: boolean;
	/** Memos 实例地址，如 "https://memos.example.com" */
	apiUrl: string;
	/** Memos 用户标识，如 "users/xiaye"，用于过滤指定用户的动态 */
	parent?: string;
};
