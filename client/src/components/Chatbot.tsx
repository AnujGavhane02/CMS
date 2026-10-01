import { useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/lib/types";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const Chatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hello! I'm your CMS assistant powered by AI. I can help you with filing complaints, tracking status, department contacts, anonymous complaints, resolution timelines, and more. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (messageToSend: string) => {
    if (!messageToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageToSend,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.sender === "user" || m.sender === "bot")
        .map((m) => ({ sender: m.sender, text: m.text }));

      const { response } = await apiClient.sendChatMessage(messageToSend, history);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Sorry, I couldn't get a response right now. Please check your connection and try again.";
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: errMsg,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    sendMessage(input.trim());
    setInput("");
  };

  const getSuggestions = () => {
    const role = user?.role || "guest";
    switch (role) {
      case "master_admin":
        return [
          "Show me live system stats",
          "Any active SLA breaches?",
          "What departments are active?",
        ];
      case "sub_admin":
        return [
          "Show department stats",
          "Any SLA breaches here?",
          "What categories do we handle?",
        ];
      case "user":
        return [
          "What is the status of my complaints?",
          "How long does resolution take?",
          "Can I file anonymously?",
        ];
      default:
        return [
          "How can I file a complaint?",
          "How do I track my complaint?",
          "Can I file anonymously?",
        ];
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">CMS Assistant</h3>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Suggestions */}
          {!isLoading && (
            <div className="px-4 pb-2 pt-1 flex flex-wrap gap-1.5 bg-background">
              {getSuggestions().map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(s)}
                  className="text-[11px] bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground px-2 py-1.5 rounded border text-left transition-colors font-medium leading-none"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            {isLoading && (
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </p>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSend()}
                disabled={isLoading}
              />
              <Button size="icon" onClick={handleSend} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};
