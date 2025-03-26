import { useState, useRef, useEffect, useMemo } from "react";
import type { FC } from "react";
import {
  EditorCommand,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  type JSONContent,
  handleImageDrop,
  handleImagePaste,
  ImageResizer,
  handleCommandNavigation
} from "novel";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { Trash2, Copy } from "lucide-react";
import { motion } from 'framer-motion';

import { defaultExtensions } from "@/components/extensions";
import { NodeSelector } from "@/components/selectors/node-selector";
import { LinkSelector } from "@/components/selectors/link-selector";
import { ColorSelector } from "@/components/selectors/color-selector";
import { TextButtons } from "@/components/selectors/text-buttons";
import { MathSelector } from "@/components/selectors/math-selector";
import GenerativeMenuSwitch from "../generative/generative-menu-switch";

import { uploadFn } from '@/components/image-upload';
import { slashCommand, suggestionItems } from "@/components/slash-commands";
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSWRConfig } from "swr";
import { cn } from "@/lib/utils";

// Keep your existing helper functions
const createUniqueExtensions = () => {
  const extensionsMap = new Map();
  const validDefaultExtensions = defaultExtensions.filter(Boolean);

  validDefaultExtensions.forEach(ext => {
    if (ext.name !== 'codeBlock') {
      extensionsMap.set(ext.name, ext);
    }
  });

  if (slashCommand) {
    extensionsMap.set(slashCommand.name, slashCommand);
  }

  return Array.from(extensionsMap.values());
};

interface EditorProps {
  initialValue?: JSONContent;
  recordId?: string;
}

// Custom event to hide editor in parent component
const dispatchEditorHideEvent = (recordId: string) => {
  // Create and dispatch a custom event that the parent can listen for
  const event = new CustomEvent('editorDeleteComplete', {
    detail: { recordId }
  });
  window.dispatchEvent(event);
};

const NovelEditor: FC<EditorProps> = ({
  initialValue,
  recordId,
}) => {
  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openMath, setOpenMath] = useState(false);
  const [openAI, setOpenAI] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [screenSize, setScreenSize] = useState("base");  // Track screen size for responsive adjustments
  const editorRef = useRef<any>(null);
  const { mutate } = useSWRConfig();

  const extensions = useMemo(() => createUniqueExtensions(), []);

  // Detect screen size on mount and window resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 2000) {
        setScreenSize("2xl");
      } else if (window.innerWidth >= 1800) {
        setScreenSize("xl");
      } else if (window.innerWidth >= 1500) {
        setScreenSize("lg");
      } else if (window.innerWidth >= 1200) {
        setScreenSize("md");
      } else {
        setScreenSize("base");
      }
    }
    
    // Set initial size
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    if (!recordId) return;

    try {
      const json = editor.getJSON();

      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, draft: json })
      });

      if (!response.ok) throw new Error('Failed to save draft');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  }, 1000);

  const handleDelete = async () => {
    if (!recordId) return;

    try {
      setIsDeleting(true);

      // Call the dedicated DELETE endpoint
      const deleteResponse = await fetch(`/api/editor?recordId=${recordId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.error || 'Failed to delete draft');
      }

      // Refresh the history list
      mutate('/api/records');

      // Dispatch a custom event to notify parent component
      dispatchEditorHideEvent(recordId);

      toast.success('Draft deleted successfully');
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete draft');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = () => {
    if (editorRef.current) {
      const editor = editorRef.current;

      if (editor) {
        // Get the HTML content from the editor
        const htmlContent = editor.getHTML();

        // Copy HTML content to clipboard
        navigator.clipboard.writeText(htmlContent)
          .then(() => toast.success('Copied to clipboard!'))
          .catch(() => toast.error('Failed to copy'));
      }
    }
  };

  // Get the appropriate font size class based on screen size
  const getFontSizeClass = () => {
    switch (screenSize) {
      case '2xl': return 'text-3xl';
      case 'xl': return 'text-2xl';
      case 'lg': return 'text-xl';
      case 'md': return 'text-lg';
      default: return 'text-base';
    }
  };

  // Get the appropriate icon size based on screen size
  const getIconSize = () => {
    switch (screenSize) {
      case '2xl': return 28;
      case 'xl': return 24;
      case 'lg': return 20;
      case 'md': return 18;
      default: return 16;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <motion.div
        className="w-full group/message h-full"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Card className="w-full bg-card h-full relative overflow-hidden">
          <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="text-foreground hover:bg-muted/10"
              title="Copy to clipboard"
            >
              <Copy className={`size-${getIconSize() > 20 ? 7 : 5}`} />
            </Button>
            {recordId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete draft"
              >
                <Trash2 className={`size-${getIconSize() > 20 ? 7 : 5}`} />
              </Button>
            )}
          </div>
          <CardContent className="p-4 h-full overflow-y-auto pt-10 relative">
            <EditorRoot>
              <EditorContent
                ref={editorRef}
                className={cn(
                  "bg-background rounded-xl p-4 w-full mx-auto prose text-foreground overflow-y-auto",
                  "mb-8 h-[calc(100%-20px)]",
                  getFontSizeClass() // Apply responsive font size
                )}
                initialContent={initialValue}
                extensions={extensions}
                editable={true}
                immediatelyRender={false}
                editorProps={{
                  handleDOMEvents: {
                    keydown: (_view, event) => handleCommandNavigation(event),
                  },
                  handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
                  handleDrop: (view, event, _slice, moved) =>
                    handleImageDrop(view, event, moved, uploadFn),
                  attributes: {
                    class: cn(
                      'prose font-title font-default focus:outline-none text-foreground max-w-none h-full',
                      getFontSizeClass() // Apply responsive font size
                    ),
                  },
                }}
                onUpdate={({ editor }) => {
                  const html = editor.getHTML();
                  const editorState = editor.getJSON();
                  debouncedUpdates(editor);
                }}
                slotAfter={<ImageResizer />}
              >
                <EditorCommand className="z-[100] h-auto max-h-[50vh] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
                  <EditorCommandList>
                    {suggestionItems.map(item => (
                      <EditorCommandItem
                        key={item.title}
                        value={item.title}
                        onCommand={val => item.command?.(val)}
                        className="flex w-full items-center space-x-2 rounded-md outline-white text-foreground"
                      >
                        <div className="flex size-10 items-center justify-center rounded-md px-2 py-1 text-left text-sm text-foreground hover:bg-accent">
                          {item.icon}
                        </div>
                        <div>
                          <p className={cn("font-medium", getFontSizeClass())}>{item.title}</p>
                          <p className={cn("text-foreground", 
                             screenSize === "base" ? "text-xs" : 
                             screenSize === "md" ? "text-sm" : 
                             screenSize === "lg" ? "text-base" : 
                             screenSize === "xl" ? "text-lg" : "text-xl"
                          )}>
                            {item.description}
                          </p>
                        </div>
                      </EditorCommandItem>
                    ))}
                  </EditorCommandList>
                </EditorCommand>
  
                <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
                  <Separator orientation="vertical" />
                  <NodeSelector open={openNode} onOpenChange={setOpenNode} />
                  <Separator orientation="vertical" />
                  <LinkSelector open={openLink} onOpenChange={setOpenLink} />
                  <Separator orientation="vertical" />
                  <MathSelector open={openMath} onOpenChange={setOpenMath} />
                  <Separator orientation="vertical" />
                  <TextButtons />
                  <Separator orientation="vertical" />
                  <ColorSelector open={openColor} onOpenChange={setOpenColor} />
                </GenerativeMenuSwitch>
              </EditorContent>
            </EditorRoot>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export { NovelEditor };