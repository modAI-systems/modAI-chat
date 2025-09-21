import { Label } from "@/shadcn/components/ui/label";

interface SettingRowProps {
    label: string;
    children: React.ReactNode;
}

export function SettingRow({ label, children }: SettingRowProps) {
    return (
        <div className="flex items-center justify-between w-full py-2 border-b">
            <Label className="text-sm font-medium text-foreground">
                {label}
            </Label>
            <div>
                {children}
            </div>
        </div>
    );
}
