declare global {
	interface Competition {
		id: string;
		participants: string[];
		readyParticipants: Set<string>;
		scramble: string | null;
		state: "waiting" | "scrambling" | "solving" | "complete";
		results: {
			userId: string;
			time: number;
		}[];
		createdAt: Date;
	}
}
