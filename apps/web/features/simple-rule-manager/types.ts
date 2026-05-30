type FieldDef = {
	readonly key: string;
	readonly labelKey: string;
	readonly type: "text" | "textarea" | "switch";
	readonly required?: boolean;
	readonly placeholder?: string;
	readonly monospace?: boolean;
};

type RuleManagerConfig<T extends { id: string }> = {
	readonly i18nNamespace: string;
	readonly queryKeyPrefix: string;
	readonly createRepository: () => {
		getAll: () => Promise<T[]>;
		getById: (id: string) => Promise<T | undefined>;
		save: (entity: T) => Promise<void>;
		delete: (id: string) => Promise<void>;
	};
	readonly fields: readonly FieldDef[];
	readonly defaultValue: Omit<T, "id">;
	readonly importParser: (raw: string) => T[];
};

export type { FieldDef, RuleManagerConfig };
