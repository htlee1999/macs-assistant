"use client";

import { Command, CommandInput } from "@/components/ui/command";
import { useCompletion } from "ai/react";
import { ArrowUp } from "lucide-react";
// Consolidate novel imports to avoid duplicates
import { useEditor, addAIHighlight } from "novel";
import { useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { CrazySpinner } from "../ui/icons";
import Magic from "../ui/magic";
import { ScrollArea } from "../ui/scroll-area";
import AICompletionCommands from "./ai-completion-command";
import AISelectorCommands from "./ai-selector-commands";

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState("");

  const { completion, complete, isLoading } = useCompletion({
    api: "/api/ask-ai",
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error("You have reached your request limit for the day.");
        return;
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const hasCompletion = completion.length > 0;

  return (
    <Command className="w-[350px]">
      {hasCompletion && (
        <div className="flex max-h-[400px]">
          <ScrollArea>
            <div className="prose p-2 px-4 prose-sm">
              <Markdown>{completion}</Markdown>
            </div>
          </ScrollArea>
        </div>
      )}

      {isLoading && (
        <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-purple-500">
          <Magic className="mr-2 size-4 shrink-0" />
          AI is thinking
          <div className="ml-2 mt-1">
            <CrazySpinner />
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="relative">
            <CommandInput
              value={inputValue}
              onValueChange={setInputValue}
              autoFocus
              placeholder={hasCompletion ? "Tell AI what to do next" : "Ask AI to edit or generate..."}
              onFocus={() => {
                if (editor) addAIHighlight(editor);
              }}
            />
            <Button
              size="icon"
              className="absolute right-2 top-1/2 size-6 -translate-y-1/2 rounded-full bg-purple-500 hover:bg-purple-900"
              onClick={() => {
                if (completion) {
                  return complete(completion, {
                    body: { option: "zap", command: inputValue },
                  }).then(() => setInputValue(""));
                }

                if (editor) {
                  const slice = editor.state.selection.content();
                  const text = editor.storage?.markdown?.serializer?.serialize(slice.content);

                  if (text) {
                    complete(text, {
                      body: { option: "zap", command: inputValue },
                    }).then(() => setInputValue(""));
                  } else {
                    toast.error("Editor is missing markdown serializer.");
                  }
                }
              }}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>

          {hasCompletion ? (
            <AICompletionCommands
              onDiscard={() => {
                if (editor) {
                  editor.chain().unsetHighlight().focus().run();
                }
                onOpenChange(false);
              }}
              completion={completion}
            />
          ) : (
            <AISelectorCommands onSelect={(value, option) => complete(value, { body: { option } })} />
          )}
        </>
      )}
    </Command>
  );
}