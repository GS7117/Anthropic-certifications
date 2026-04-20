import { test, expect, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel } from "../ToolCallBadge";

afterEach(cleanup);

describe("getToolCallLabel", () => {
  test("str_replace_editor create", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating /App.jsx");
  });

  test("str_replace_editor str_replace", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/components/Card.jsx" })).toBe("Editing /components/Card.jsx");
  });

  test("str_replace_editor insert", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing /App.jsx");
  });

  test("str_replace_editor undo_edit", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Editing /App.jsx");
  });

  test("str_replace_editor view", () => {
    expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing /App.jsx");
  });

  test("file_manager rename", () => {
    expect(getToolCallLabel("file_manager", { command: "rename", path: "/old.jsx" })).toBe("Renaming /old.jsx");
  });

  test("file_manager delete", () => {
    expect(getToolCallLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting /App.jsx");
  });

  test("unknown tool falls back to title-cased name", () => {
    expect(getToolCallLabel("some_unknown_tool", {})).toBe("Some Unknown Tool");
  });
});

describe("ToolCallBadge", () => {
  test("shows human-readable label for create command", () => {
    render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  });

  test("shows spinner when pending", () => {
    const { container } = render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("shows green dot when done", () => {
    const { container } = render(
      <ToolCallBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
      />
    );
    expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  test("shows label for file_manager delete", () => {
    render(
      <ToolCallBadge
        toolName="file_manager"
        args={{ command: "delete", path: "/App.jsx" }}
        state="result"
      />
    );
    expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
  });
});
