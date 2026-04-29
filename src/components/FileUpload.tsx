import { useRef } from "react";
import { FileText } from "lucide-react";
import { motion } from "motion/react";

interface Props {
  onUpload: (text: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onUpload, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) onUpload(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      <input type="file" accept=".txt" ref={inputRef} style={{ display: "none" }} onChange={handleFile} />
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
      </motion.button>
    </>
  );
}
