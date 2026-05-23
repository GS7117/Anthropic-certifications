"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { UIMessage, DefaultChatTransport } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: UIMessage[];
}

interface ChatContextType {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  const { fileSystem, handleToolCall } = useFileSystem();
  const [input, setInput] = useState("");

  // Refs so the body function always captures the latest values at request time
  const fileSystemRef = useRef(fileSystem);
  fileSystemRef.current = fileSystem;
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  const {
    messages,
    sendMessage,
    status,
  } = useAIChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        files: fileSystemRef.current.serialize(),
        projectId: projectIdRef.current,
      }),
    }),
  });

  // Track processed tool call IDs to avoid double-processing
  const processedToolCallIds = useRef<Set<string>>(new Set());

  // Server-side tools are providerExecuted — onToolCall won't fire for them.
  // Instead, watch messages for completed dynamic-tool parts and mirror them
  // into the client-side VirtualFileSystem.
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        if (
          part.type === "dynamic-tool" &&
          part.state === "output-available" &&
          !processedToolCallIds.current.has(part.toolCallId)
        ) {
          processedToolCallIds.current.add(part.toolCallId);
          handleToolCall({ toolName: part.toolName, args: part.input });
        }
      }
    }
  }, [messages, handleToolCall]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  // Track anonymous work
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        handleInputChange,
        handleSubmit,
        status,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
