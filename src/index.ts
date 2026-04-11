#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import { execSynthLang, execSynthLangOptimize, execSynthLangEvolve } from "./tools/synthlang-bridge.js";

const server = new McpServer({
  name: "synthlang-mcp",
  version: "1.0.0",
});

// Tool 1: Compress/translate prompts to SynthLang format
server.registerTool("synthlang_compress", {
  description:
    "Translate a natural language prompt into compressed SynthLang format. " +
    "Reduces token count by up to 70% while preserving semantic meaning. " +
    "Use this before sending prompts to any LLM to reduce costs.",
  inputSchema: {
    prompt: z.string().describe("The natural language prompt to compress"),
    framework: z
      .string()
      .default("synthlang")
      .describe("Target framework for translation (default: synthlang)"),
    show_metrics: z
      .boolean()
      .default(true)
      .describe("Include token count and cost metrics in response"),
  },
}, async ({ prompt, framework, show_metrics }) => {
  const result = await execSynthLang("translate", {
    source: prompt,
    framework,
    showMetrics: show_metrics,
  });
  return {
    content: [{ type: "text" as const, text: result }],
  };
});

// Tool 2: Optimize prompts using DSPy techniques
server.registerTool("synthlang_optimize", {
  description:
    "Optimize a prompt using DSPy-based techniques for better LLM performance. " +
    "Iteratively refines the prompt structure and wording.",
  inputSchema: {
    prompt: z.string().describe("The prompt to optimize"),
    max_iterations: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Maximum optimization iterations (default: 5)"),
  },
}, async ({ prompt, max_iterations }) => {
  const result = await execSynthLangOptimize(prompt, max_iterations);
  return {
    content: [{ type: "text" as const, text: result }],
  };
});

// Tool 3: Evolve prompts using genetic algorithms
server.registerTool("synthlang_evolve", {
  description:
    "Evolve a prompt using genetic algorithms and self-play tournaments. " +
    "Generates a population of prompt variants and selects the fittest through competition. " +
    "Best for finding novel, high-performance prompt formulations.",
  inputSchema: {
    prompt: z.string().describe("The seed prompt to evolve"),
    generations: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Number of evolution generations (default: 10)"),
    population_size: z
      .number()
      .int()
      .min(2)
      .max(20)
      .default(5)
      .describe("Population size per generation (default: 5)"),
  },
}, async ({ prompt, generations, population_size }) => {
  const result = await execSynthLangEvolve(prompt, generations, population_size);
  return {
    content: [{ type: "text" as const, text: result }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SynthLang MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
