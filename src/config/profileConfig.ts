import type { ProfileConfig } from "../types/config";

export const profileConfig: ProfileConfig = {
	// 头像
	// 图片路径支持三种格式：
	// 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
	// 2. src 目录（不以 "/"开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
	// 3. 远程 URL："https://example.com/avatar.jpg"
	avatar: "/assets/ziyuan/tx.webp",

	// 下班时间头像（为空则始终使用上方 avatar）
	avatarOffWork: "",

	// 名字
	name: "lh",

	// 首页展示名字（留空则使用 name）
	displayName: "lh",

	// 职业/身份标签
	occupation: "[生活记录者]",

	// 个人签名（支持多条，会循环打字+删除效果）
	bio: ["每一天都有趣有得！"],

	// 链接配置
	// 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	links: [
		{
			name: "QQ",
			icon: "simple-icons:tencentqq",
      		url: 'https://qun.qq.com/universal-share/share?ac=1&authKey=8z%2ByvkL3EKwjCtmc6QKZmduI/ufFtZBvx7D0DMhqKJwBEM7PUy/swJfkMUCv3aoi&busi_data=eyJncm91cENvZGUiOiIxMTAyOTAyNjUwIiwidG9rZW4iOiJyRGU1Mnl5UUFVMDJMV1NLZkI0bmJrQm9qT29DRDM2Vk1TVEtqVytaTnZ4U2JUWEIwd29rNVNON2ZEQlp2TUhMIiwidWluIjoiNzg0Nzc0ODM1In0=&data=T_QVe-9P0pKN7Dg5Zp7H0zqeFfAolUlhY4fL3A4fuO1ShkcKonYSmw8fbb6_sRcbl-z_yrNts0JGtBZtrDi7ZqZZtrdz5eexpBsLavvtTPU&svctype=5&tempid=h5_group_info',
			showName: false,
		},
		{
			name: "GitHub",
			icon: "simple-icons:github",
      		url: 'https://github.com/sgwfmyl',
			showName: false,
		},
		{
			name: "Email",
			icon: "material-symbols:mail-outline",
      		url: 'mailto:sgwfmyl@gmail.com',
			showName: false,
		},
		{
			name: "Bilibili",
			icon: "simple-icons:bilibili",
      		url: 'https://space.bilibili.com/3546688272730705?spm_id_from=333.1007.0.0',
			showName: false,
		},
	],
};
