import type { UserInfo } from "@waline/api";

import type { MomentQuote } from "@/types/moment-chat";

export type GuestbookMessageLocalState = "sending" | "failed";

export type GuestbookAuthUser = UserInfo & {
	remember?: boolean;
};

export interface GuestbookProfile {
	nick: string;
	mail: string;
	link: string;
}

export interface GuestbookEmojiItem {
	key: string;
	url: string;
}

export interface GuestbookEmojiPack {
	name: string;
	icon: string;
	items: GuestbookEmojiItem[];
}

export interface GuestbookImageAttachment {
	name: string;
	url: string;
}

export interface GuestbookChatMessage {
	id: string;
	objectId?: number;
	userId?: number;
	nick: string;
	avatar: string;
	link?: string;
	body: string;
	createdAt: number;
	browser?: string;
	os?: string;
	addr?: string;
	label?: string;
	isAdmin: boolean;
	momentQuote?: MomentQuote | null;
	replyToId?: string;
	replyToNick?: string;
	status?: string;
	localState?: GuestbookMessageLocalState;
	failureReason?: string;
}
