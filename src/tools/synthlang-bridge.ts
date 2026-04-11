import { spawn } from "node:child_process";

interface TranslateOptions {
  source: string;
  framework: string;
  showMetrics: boolean;
}

/**
 * Execute SynthLang translate CLI command.
 * Bridges Node.js → Python SynthLang package via subprocess.
 */
export async function execSynthLang(
  command: string,
  options: TranslateOptions
): Promise<string> {
  const args = [
    command,
    "--source",
    options.source,
    "--framework",
    options.framework,
  ];
  if (options.showMetrics) {
    args.push("--show-metrics");
  }
  return runSynthLangCli(args);
}

/**
 * Execute SynthLang optimize command.
 */
export async function execSynthLangOptimize(
  prompt: string,
  maxIterations: number
): Promise<string> {
  // The optimize CLI only takes --prompt; max_iterations requires Python API.
  // We use the Python API directly for full control.
  return runPythonScript(`
import json, sys
from synthlang.core.optimizer import PromptOptimizer
try:
    import dspy
    lm = dspy.LM("openai/gpt-4o-mini")
    optimizer = PromptOptimizer(lm)
    result = optimizer.optimize(${JSON.stringify(prompt)}, max_iterations=${maxIterations})
    print(json.dumps(result, indent=2))
except Exception as e:
    print(json.dumps({"error": str(e), "hint": "Ensure OPENAI_API_KEY is set"}))
`);
}

/**
 * Execute SynthLang evolve command.
 */
export async function execSynthLangEvolve(
  prompt: string,
  generations: number,
  populationSize: number
): Promise<string> {
  return runPythonScript(`
import json, sys
from synthlang.core.evolver import PromptEvolver
try:
    import dspy
    lm = dspy.LM("openai/gpt-4o-mini")
    evolver = PromptEvolver(lm, population_size=${populationSize})
    result = evolver.evolve(${JSON.stringify(prompt)}, generations=${generations})
    if hasattr(result, '__dict__'):
        print(json.dumps(result.__dict__, indent=2, default=str))
    else:
        print(json.dumps({"result": str(result)}, indent=2))
except Exception as e:
    print(json.dumps({"error": str(e), "hint": "Ensure OPENAI_API_KEY is set"}))
`);
}

/**
 * Run synthlang CLI subprocess and capture output.
 */
function runSynthLangCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("synthlang", args, {
      env: { ...process.env },
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim() || "Translation complete (no output)");
      } else {
        resolve(
          JSON.stringify({
            error: `SynthLang CLI exited with code ${code}`,
            stderr: stderr.trim(),
            hint: "Ensure OPENAI_API_KEY is set in environment",
          })
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn synthlang: ${err.message}`));
    });
  });
}

/**
 * Run an inline Python script and capture output.
 * Used for SynthLang Python API calls that aren't exposed via CLI.
 */
function runPythonScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", ["-c", script], {
      env: { ...process.env },
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        resolve(
          JSON.stringify({
            error: `Python script exited with code ${code}`,
            stderr: stderr.trim(),
            stdout: stdout.trim(),
          })
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn python: ${err.message}`));
    });
  });
}
