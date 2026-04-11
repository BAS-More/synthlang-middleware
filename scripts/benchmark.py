"""
SynthLang Compression Benchmark
Tests prompt compression ratio and quality on sample agent prompts.
Requires: pip install synthlang, OPENAI_API_KEY set in environment.
"""
import json
import os
import sys
import time

# Sample prompts from typical BAS-More agent interactions
SAMPLE_PROMPTS = [
    # MAH classifier prompt
    "Analyze the following task and classify it into one of these tiers: S (simple, single agent), M (medium, 2-3 agents), L (large, 4-6 agents), XL (extra-large, 7+ agents). Consider the complexity of the instruction, number of distinct deliverables, required expertise domains, and whether file processing is needed. Return your classification as JSON with fields: tier, confidence, reasoning, delegationChain.",

    # ruflo architect agent
    "You are the Architect agent in a multi-agent development system. Your role is to analyze the user's request and design the implementation architecture. Break down the work into discrete tasks that can be delegated to specialized agents (coder, tester, reviewer, security). For each task, specify: the agent to assign it to, the input data it needs, the expected output format, and any dependencies on other tasks. Consider error handling, testing strategy, and security implications.",

    # EZRA governance check
    "Review the following code changes against the project's architectural decisions and governance rules. Check for: violations of protected file paths, non-compliance with recorded ADRs (architectural decision records), drift from the approved technology stack, security vulnerabilities (OWASP top 10), and code quality issues. Report each finding with severity (critical, warning, info), the specific rule violated, and a suggested remediation.",

    # Quiz2Biz question generation
    "Generate a multiple-choice business quiz question based on the following topic and difficulty level. The question should test practical business knowledge, not trivia. Include 4 answer options where exactly one is correct, the others should be plausible but distinguishable. Provide an explanation for why the correct answer is right and why each incorrect answer is wrong. Format as JSON with fields: question, options (array of 4), correctIndex, explanation.",

    # watchdog health analysis
    "Analyze the following system health metrics collected over the past 24 hours and generate a summary report. Metrics include: CPU usage (min, max, avg, p95), memory consumption per process, disk I/O rates, network throughput, and active process counts. Identify any anomalies, trends, or concerning patterns. Provide specific recommendations for optimization if any thresholds are exceeded. Format the report in markdown with sections: Overview, Key Findings, Anomalies, Recommendations.",

    # Short prompt (should be skipped)
    "Summarize this text in 3 bullet points.",

    # Total-Recall memory query
    "Search the persistent memory store for all entries related to the current project context. Prioritize entries by relevance score and recency. For each result, return: the memory content, creation timestamp, confidence score, source attribution, and any linked decision records. Apply the following filters: minimum confidence 0.7, maximum age 30 days, memory types include pattern, decision-context, and lesson. Limit results to the top 10 most relevant entries.",
]


def benchmark_synthlang():
    """Run SynthLang translation on sample prompts and measure compression."""
    try:
        from synthlang.core.translator import FrameworkTranslator
        import dspy
    except ImportError as e:
        print(f"Missing dependency: {e}")
        print("Install with: pip install synthlang")
        sys.exit(1)

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set")
        print("\nRunning in DRY-RUN mode (estimating compression from prompt structure)...")
        dry_run_benchmark()
        return

    lm = dspy.LM("openai/gpt-4o-mini")
    translator = FrameworkTranslator(lm)

    results = []
    total_original = 0
    total_compressed = 0

    print("=" * 70)
    print("SynthLang Compression Benchmark")
    print("=" * 70)

    for i, prompt in enumerate(SAMPLE_PROMPTS, 1):
        print(f"\nPrompt {i} ({len(prompt)} chars):")
        print(f"  Preview: {prompt[:80]}...")

        start = time.time()
        try:
            result = translator.translate(prompt)
            elapsed = time.time() - start
            compressed = result.translated_text if hasattr(result, 'translated_text') else str(result)
            compressed_len = len(compressed)
            original_len = len(prompt)
            reduction = round((1 - compressed_len / original_len) * 100, 1)

            total_original += original_len
            total_compressed += compressed_len

            results.append({
                "prompt_index": i,
                "original_chars": original_len,
                "compressed_chars": compressed_len,
                "reduction_percent": reduction,
                "time_ms": round(elapsed * 1000),
            })

            print(f"  Original:   {original_len} chars")
            print(f"  Compressed: {compressed_len} chars")
            print(f"  Reduction:  {reduction}%")
            print(f"  Time:       {round(elapsed * 1000)}ms")
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({
                "prompt_index": i,
                "error": str(e),
            })

    # Summary
    if total_original > 0:
        overall_reduction = round((1 - total_compressed / total_original) * 100, 1)
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Total original:    {total_original} chars")
        print(f"Total compressed:  {total_compressed} chars")
        print(f"Overall reduction: {overall_reduction}%")
        print(f"Prompts tested:    {len([r for r in results if 'error' not in r])}")
        print(f"Errors:            {len([r for r in results if 'error' in r])}")

        # Validation gate
        print("\n--- VALIDATION GATE ---")
        if overall_reduction >= 50:
            print(f"PASS: {overall_reduction}% reduction >= 50% target")
        elif overall_reduction >= 30:
            print(f"WARN: {overall_reduction}% reduction is between 30-50%")
        else:
            print(f"FAIL: {overall_reduction}% reduction < 30% minimum")

    # Write results
    with open("benchmark-results.json", "w") as f:
        json.dump({"results": results, "summary": {
            "total_original_chars": total_original,
            "total_compressed_chars": total_compressed,
            "overall_reduction_percent": overall_reduction if total_original > 0 else 0,
        }}, f, indent=2)
    print("\nResults written to benchmark-results.json")


def dry_run_benchmark():
    """Estimate compression without API key (based on typical SynthLang ratios)."""
    print("\n" + "=" * 70)
    print("DRY-RUN ESTIMATES (typical SynthLang compression ratios)")
    print("=" * 70)

    # SynthLang typically achieves 40-70% compression on structured prompts
    for i, prompt in enumerate(SAMPLE_PROMPTS, 1):
        length = len(prompt)
        # Longer, more structured prompts compress better
        if length < 100:
            est_ratio = 0.15  # Short prompts don't compress well
        elif length < 300:
            est_ratio = 0.45
        else:
            est_ratio = 0.60  # Longer prompts with repeated structures compress well

        est_compressed = int(length * (1 - est_ratio))
        print(f"  Prompt {i}: {length} chars -> ~{est_compressed} chars (~{int(est_ratio * 100)}% reduction)")

    print("\nTo run actual benchmarks, set OPENAI_API_KEY and re-run.")


if __name__ == "__main__":
    benchmark_synthlang()
