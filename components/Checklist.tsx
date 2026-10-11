import type { FieldsConfig, Profile } from "@/libs/chat-shared";

export function Checklist({ fields, profile }: { fields: FieldsConfig; profile: Profile }) {
    const keys = Object.keys(fields);
    const completed = keys.filter((key) => profile[key] !== null && profile[key] !== undefined).length;
    const total = keys.length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
        <div className="space-y-2 py-4" aria-label="Profile progress">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-secondary">
                <span>Profile progress</span>
            </div>
            <div
                role="progressbar"
                aria-label="Profile completion"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={completed}
                className="h-2 w-full overflow-hidden rounded-full bg-primary/10"
            >
                <div
                    className={`h-full rounded-full transition-[width] duration-500 ease-out ${percentage === 100 ? "bg-growth" : "bg-accent"}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}