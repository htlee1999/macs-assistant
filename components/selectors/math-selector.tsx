import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SigmaIcon } from "lucide-react";
import { useEditor } from "novel";

interface MathSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MathSelector = ({ open, onOpenChange }: MathSelectorProps) => {
  const { editor } = useEditor();

  if (!editor) return null;

  const cleanKatexHtml = () => {
    // Get all math elements in the editor
    const editorElement = editor.view.dom;
    const katexHtmlElements = editorElement.getElementsByClassName('katex-html');
    
    // Convert to array and remove each katex-html element
    Array.from(katexHtmlElements).forEach(elem => {
      elem.remove();
    });
  };

  const handleMathToggle = () => {
    if (editor.isActive("math")) {
      const mathNode = editor.state.selection.$anchor.parent;
      const latex = mathNode.attrs.latex;
      
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent(latex)
        .run();
    } else {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      
      if (!selectedText.trim()) return;
      
      editor
        .chain()
        .focus()
        .deleteSelection()
        .setLatex({ latex: selectedText })
        .run();
    }

    // Clean up katex-html elements after the operation
    setTimeout(cleanKatexHtml, 0);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="rounded-none w-12"
      onClick={handleMathToggle}
    >
      <SigmaIcon
        className={cn("size-4", { "text-blue-500": editor.isActive("math") })}
        strokeWidth={2.3}
      />
    </Button>
  );
};