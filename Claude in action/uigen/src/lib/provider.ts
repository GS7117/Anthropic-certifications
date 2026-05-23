import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV2,
  LanguageModelV2StreamPart,
  LanguageModelV2Prompt,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = "v2" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly supportedUrls = {};

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV2Prompt): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const textParts = message.content
          .filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text);
        return textParts.join(" ");
      }
    }
    return "";
  }

  private async *generateMockStream(
    messages: LanguageModelV2Prompt,
    userPrompt: string
  ): AsyncGenerator<LanguageModelV2StreamPart> {
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card") || promptLower.includes("pricing")) {
      componentType = "card";
      componentName = "Card";
    }

    yield { type: "stream-start", warnings: [] };

    const textId = "text-0";

    const emitText = async function* (text: string): AsyncGenerator<LanguageModelV2StreamPart> {
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await new Promise((r) => setTimeout(r, 15));
      }
      yield { type: "text-end", id: textId };
    };

    const usage = { inputTokens: 50 as number | undefined, outputTokens: 30 as number | undefined, totalTokens: 80 as number | undefined };

    if (toolMessageCount === 0) {
      yield* emitText(
        "This is a static response. Set ANTHROPIC_API_KEY in .env to use real generation. Let me create an App.jsx to display the component."
      );
      yield {
        type: "tool-call",
        toolCallId: "call_3",
        toolName: "str_replace_editor",
        input: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };
      yield { type: "finish", finishReason: "tool-calls", usage };
      return;
    }

    if (toolMessageCount === 1) {
      yield* emitText(`I'll create a ${componentName} component for you.`);
      yield {
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "str_replace_editor",
        input: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };
      yield { type: "finish", finishReason: "tool-calls", usage };
      return;
    }

    if (toolMessageCount === 2) {
      yield* emitText("Let me enhance the component with better styling.");
      yield {
        type: "tool-call",
        toolCallId: "call_2",
        toolName: "str_replace_editor",
        input: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };
      yield { type: "finish", finishReason: "tool-calls", usage };
      return;
    }

    yield* emitText(
      `Done! I've created:\n\n1. **${componentName}.jsx** — the ${componentType} component\n2. **App.jsx** — entry point displaying the component\n\nYou can see the preview on the right.`
    );
    yield { type: "finish", finishReason: "stop", usage: { ...usage, outputTokens: 50, totalTokens: 100 } };
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thank you! We\\'ll get back to you soon.');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {['name', 'email'].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
            <input
              type={field === 'email' ? 'email' : 'text'}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea name="message" value={formData.message} onChange={handleChange} required rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({
  title = "Pro Plan",
  price = "$29",
  period = "/month",
  features = ["Unlimited projects", "Priority support", "Advanced analytics", "Custom domains"],
  cta = "Get Started"
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm mx-auto border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <div className="flex items-end gap-1 mb-6">
        <span className="text-4xl font-extrabold text-gray-900">{price}</span>
        <span className="text-gray-500 mb-1">{period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-gray-600">
            <span className="text-green-500">✓</span>{f}
          </li>
        ))}
      </ul>
      <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
        {cta}
      </button>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button onClick={() => setCount(c => c - 1)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">−</button>
        <button onClick={() => setCount(0)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">Reset</button>
        <button onClick={() => setCount(c => c + 1)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">+</button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form": return "    alert('Thank you! We\\'ll get back to you soon.');";
      case "card": return '      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm mx-auto border border-gray-100">';
      default: return "  const [count, setCount] = useState(0);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form": return "    alert('Message sent! We\\'ll reply within 24 hours.');";
      case "card": return '      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm mx-auto border border-gray-100 hover:shadow-2xl transition-shadow">';
      default: return "  const [count, setCount] = useState(0);\n  const max = 10;";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <Card />
    </div>
  );
}`;
    }
    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <${componentName} />
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV2["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const parts: LanguageModelV2StreamPart[] = [];
    for await (const part of this.generateMockStream(options.prompt, userPrompt)) {
      parts.push(part);
    }

    const content: Array<{ type: "text"; text: string } | { type: "tool-call"; toolCallId: string; toolName: string; input: string }> = [];
    let currentText = "";
    for (const part of parts) {
      if (part.type === "text-delta") currentText += part.delta;
      if (part.type === "text-end" && currentText) {
        content.push({ type: "text", text: currentText });
        currentText = "";
      }
      if (part.type === "tool-call") {
        content.push({ type: "tool-call", toolCallId: part.toolCallId, toolName: part.toolName, input: part.input });
      }
    }

    const finishPart = parts.find((p) => p.type === "finish") as any;
    return {
      content: content as any,
      finishReason: finishPart?.finishReason ?? "stop",
      usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      warnings: [],
    };
  }

  async doStream(
    options: Parameters<LanguageModelV2["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        try {
          for await (const chunk of self.generateMockStream(options.prompt, userPrompt)) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return { stream, request: { body: {} } };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
