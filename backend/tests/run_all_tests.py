#!/usr/bin/env python3
"""Test runner for all pipeline components."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import subprocess
from pathlib import Path
import time
from datetime import datetime

class TestRunner:
    """Runs all pipeline tests and collects results."""

    def __init__(self):
        self.test_dir = Path(__file__).parent
        self.results = []
        self.total_time = 0

    def run_test(self, test_file, description):
        """Run a single test file."""
        test_path = self.test_dir / test_file

        if not test_path.exists():
            print(f"❌ Test file not found: {test_file}")
            return False

        print(f"\n{'='*60}")
        print(f"🧪 {description}")
        print(f"{'='*60}")

        start_time = time.time()

        try:
            # Run the test
            result = subprocess.run([
                sys.executable, str(test_path)
            ], capture_output=True, text=True, timeout=300)  # 5 minute timeout

            end_time = time.time()
            duration = end_time - start_time
            self.total_time += duration

            # Check result
            success = result.returncode == 0

            print(f"\n⏱️  Test duration: {duration:.1f}s")

            if success:
                print(f"✅ {description} - PASSED")
            else:
                print(f"❌ {description} - FAILED")
                if result.stderr:
                    print(f"Error output:\n{result.stderr}")

            self.results.append({
                'test': test_file,
                'description': description,
                'success': success,
                'duration': duration,
                'stdout': result.stdout,
                'stderr': result.stderr
            })

            return success

        except subprocess.TimeoutExpired:
            print(f"⏰ Test timed out after 5 minutes")
            self.results.append({
                'test': test_file,
                'description': description,
                'success': False,
                'duration': 300,
                'error': 'Timeout'
            })
            return False

        except Exception as e:
            print(f"💥 Test execution failed: {e}")
            self.results.append({
                'test': test_file,
                'description': description,
                'success': False,
                'duration': 0,
                'error': str(e)
            })
            return False

    def run_all_tests(self):
        """Run all pipeline tests."""
        print("🚀 Running All Pipeline Tests")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        tests = [
            ('test_audio_conversion.py', 'Audio Conversion Tests'),
            ('test_diarization.py', 'Speaker Diarization Tests'),
            ('test_speaker_embeddings.py', 'Speaker Embedding Tests'),
            ('test_speaker_matching.py', 'Speaker Matching Tests'),
            ('test_transcription.py', 'Transcription Tests')
        ]

        successful_tests = 0

        for test_file, description in tests:
            success = self.run_test(test_file, description)
            if success:
                successful_tests += 1

        self.print_summary(successful_tests, len(tests))
        return successful_tests == len(tests)

    def print_summary(self, successful, total):
        """Print test summary."""
        print(f"\n{'='*60}")
        print("📊 TEST SUMMARY")
        print(f"{'='*60}")

        print(f"🕒 Total time: {self.total_time:.1f}s")
        print(f"📝 Tests run: {total}")
        print(f"✅ Passed: {successful}")
        print(f"❌ Failed: {total - successful}")
        print(f"📈 Success rate: {successful/total*100:.1f}%")

        print(f"\n📋 Individual Results:")
        for result in self.results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            duration = f"{result['duration']:.1f}s"
            print(f"   {status:<10} {duration:<8} {result['description']}")

        # Show failures
        failures = [r for r in self.results if not r['success']]
        if failures:
            print(f"\n🔍 Failed Tests:")
            for failure in failures:
                print(f"   ❌ {failure['test']}")
                if 'error' in failure:
                    print(f"      Error: {failure['error']}")
                elif failure.get('stderr'):
                    lines = failure['stderr'].strip().split('\n')
                    print(f"      Error: {lines[-1] if lines else 'Unknown error'}")

        if successful == total:
            print(f"\n🎉 All tests passed! Pipeline is ready.")
        else:
            print(f"\n⚠️  {total - successful} test(s) failed. Check individual outputs above.")

    def save_results(self):
        """Save test results to file."""
        import json

        output_dir = Path("data/test_results")
        output_dir.mkdir(exist_ok=True)

        result_file = output_dir / "all_tests_summary.json"

        summary = {
            'timestamp': datetime.now().isoformat(),
            'total_tests': len(self.results),
            'successful_tests': len([r for r in self.results if r['success']]),
            'total_duration': self.total_time,
            'results': self.results
        }

        with open(result_file, 'w') as f:
            json.dump(summary, f, indent=2, default=str)

        print(f"\n💾 Results saved to: {result_file}")

def run_quick_tests():
    """Run only quick tests (skip slow ones)."""
    print("⚡ Running Quick Tests Only")
    print("=" * 40)

    runner = TestRunner()

    quick_tests = [
        ('test_audio_conversion.py', 'Audio Conversion Tests'),
        ('test_speaker_matching.py', 'Speaker Matching Tests'),
    ]

    successful = 0
    for test_file, description in quick_tests:
        if runner.run_test(test_file, description):
            successful += 1

    runner.print_summary(successful, len(quick_tests))
    runner.save_results()

    return successful == len(quick_tests)

def main():
    """Main test runner."""
    if len(sys.argv) > 1 and sys.argv[1] == '--quick':
        success = run_quick_tests()
    else:
        runner = TestRunner()
        success = runner.run_all_tests()
        runner.save_results()

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()