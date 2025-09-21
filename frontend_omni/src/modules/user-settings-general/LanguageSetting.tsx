import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LanguageSettingProps {
    value?: string;
    onValueChange?: (value: string) => void;
}

const languages = [
    { value: "en", label: "English" },
    { value: "de", label: "Deutsch" }
];

export function LanguageSetting({ value = "en", onValueChange }: LanguageSettingProps) {
    const [selectedLanguage, setSelectedLanguage] = useState(value);

    const handleValueChange = (newValue: string) => {
        setSelectedLanguage(newValue);
        onValueChange?.(newValue);
    };

    return (
        <Select value={selectedLanguage} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
                {languages.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                        {language.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
