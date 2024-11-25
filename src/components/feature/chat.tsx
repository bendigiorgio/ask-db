"use client";
import { queryDb } from "@/actions/query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Markdown from "react-markdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { Computer, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import { dbTypes } from "@/static/db-types";

const Chat = () => {
  const [messages, setMessages] = React.useState<
    { message: string; user: "user" | "ai" }[]
  >([]);
  const [query, setQuery] = React.useState("");
  const [selectedDB, setSelectedDB] = React.useState<(typeof dbTypes)[number]>(
    dbTypes[2]
  );
  const [connectionString, setConnectionString] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!connectionString) {
        toast.error("コネクション文字列が提供されていません");
        throw new Error("No connection string provided");
      }
      setMessages([...messages, { message, user: "user" }]);
      const result = await queryDb(
        message,
        connectionString,
        selectedDB,
        messages.map((m) => m.message)
      );
      if (result.data) {
        setMessages([
          ...messages,
          { message, user: "user" },
          { message: result.data, user: "ai" },
        ]);
        setQuery("");
        setIsPending(false);
        scrollAreaRef.current?.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: "smooth",
        });
      } else {
        toast.error("エラーが発生しました");
      }
    },
  });

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setIsPending(true);
    sendMessageMutation.mutate(query);
    scrollAreaRef.current?.scrollTo({
      top: scrollAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  useHotkeys("mod+enter", () => {
    if (!query.length || isPending || !connectionString) {
      return;
    }
    handleSubmit();
  });
  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-md flex flex-col max-w-7xl w-full mx-auto p-4 gap-6 max-h-[90vh]"
    >
      {/* SETTINGS */}
      <div className="flex items-center gap-x-8 max-w-full">
        <Label className="flex items-center gap-x-2">
          DB
          <Select
            value={selectedDB}
            onValueChange={(value) =>
              setSelectedDB(value as (typeof dbTypes)[number])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dbTypes.map((dbType, i) => (
                <SelectItem key={`${dbType}-${i}`} value={dbType}>
                  {dbType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Label>
        <Label className="flex items-center gap-x-2 w-full">
          <span className="whitespace-nowrap">コネクション文字列</span>
          <Input
            required
            className="w-full invalid:text-red-500 invalid:border-red-500 invalid:!ring-0 transition"
            value={connectionString}
            placeholder="postgres://postgres:password@localhost:5432/postgres"
            onInput={(e) => {
              setConnectionString((e.target as HTMLInputElement).value);
            }}
          />
        </Label>
      </div>
      {/* CHAT AREA */}
      <div
        ref={scrollAreaRef}
        className="border min-h-64 overflow-y-auto overflow-x-clip rounded-md"
      >
        {messages.map((message, i) => (
          <div
            key={`message-${i}`}
            className={cn(
              "p-2 flex gap-x-2",
              message.user === "user" ? "flex-row-reverse" : ""
            )}
          >
            <div
              className={cn(
                "rounded-full h-8 w-8 flex items-center justify-center",
                message.user === "ai" ? "bg-secondary" : "bg-secondary/30"
              )}
            >
              {message.user === "ai" ? (
                <Computer className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div
              className={cn(
                "p-6 rounded-md max-w-[80%]",
                message.user === "ai" ? "bg-secondary" : "bg-secondary/30"
              )}
            >
              <Markdown
                className="[&_ul]:list-disc [&_ol]:list-disc [&>*]:pt-0 [&>*]:mt-0"
                components={{
                  code(props) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { children, className, node, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    return match ? (
                      <code {...rest} className={className}>
                        {children}
                      </code>
                    ) : (
                      <code {...rest} className={className}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.message}
              </Markdown>
            </div>
          </div>
        ))}
        {isPending ? <div className="animate-pulse pl-4">考え中...</div> : null}
      </div>
      <div className="flex items-center gap-4">
        <Textarea
          name="query"
          ref={textareaRef}
          disabled={isPending}
          className="invalid:text-red-500 invalid:border-red-500 invalid:!ring-0 transition"
          required
          value={query}
          onInput={(e) => {
            setQuery((e.target as HTMLTextAreaElement).value);
          }}
        />
        <Button disabled={!query.length || isPending} type="submit">
          送信
        </Button>
      </div>
    </form>
  );
};

export default Chat;
