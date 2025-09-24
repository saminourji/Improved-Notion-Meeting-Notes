#!/usr/bin/env python3
"""Test LLM integration for generating summaries and action items."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
import json
from dotenv import load_dotenv
from app.services.llm_service import LLMService

# Load environment variables
load_dotenv()

def test_llm_summary_generation():
    """Test LLM summary generation with real transcript."""
    print("🤖 Testing LLM Summary Generation")
    print("=" * 50)

    # Check environment
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ OPENAI_API_KEY not found in environment")
        print("   Please add your OpenAI API key to .env file")
        return False

    print("✅ OpenAI API key found")

    # Load a test transcript
    test_results_dir = Path("data/test_results")
    transcript_file = test_results_dir / "transcription_speaker_annotated_transcription_results.json"

    if not transcript_file.exists():
        print("❌ Test transcript not found")
        print("   Run transcription tests first to generate test data")
        return False

    try:
        with open(transcript_file, 'r') as f:
            transcript_data = json.load(f)

        speaker_transcript = transcript_data.get('full_transcript', '')
        if not speaker_transcript:
            print("❌ No speaker-annotated transcript found in test data")
            return False

        print(f"📄 Using transcript from test data:")
        print(f"   Length: {len(speaker_transcript)} characters")
        print(f"   Word count: {transcript_data.get('word_count', 'unknown')}")

        # Preview transcript
        preview = speaker_transcript[:300] + "..." if len(speaker_transcript) > 300 else speaker_transcript
        print(f"   Preview: {preview}")

        # Initialize LLM service
        llm_service = LLMService(openai_key)

        print(f"\n🤖 Generating meeting summary...")
        summary_result = llm_service.generate_meeting_summary(
            speaker_transcript,
            {'duration': 1.5}  # About 1.5 minutes
        )

        print(f"✅ Summary generated successfully")
        print(f"   Participants: {summary_result['participants']}")
        print(f"   Tokens used: {summary_result['metadata'].get('tokens_used', 'unknown')}")

        # Show summary
        print(f"\n📝 Generated Summary:")
        print("=" * 40)
        print(summary_result['summary'])
        print("=" * 40)

        # Save results
        save_llm_test_results({
            'test_type': 'summary_generation',
            'input_transcript_length': len(speaker_transcript),
            'participants': summary_result['participants'],
            'summary': summary_result['summary'],
            'metadata': summary_result['metadata']
        })

        return True

    except Exception as e:
        print(f"❌ Summary generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_llm_action_items_extraction():
    """Test LLM action items extraction with real transcript."""
    print("\n📋 Testing LLM Action Items Extraction")
    print("=" * 50)

    # Check environment
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return False

    # Load test transcript
    test_results_dir = Path("data/test_results")
    transcript_file = test_results_dir / "transcription_speaker_annotated_transcription_results.json"

    if not transcript_file.exists():
        print("❌ Test transcript not found")
        return False

    try:
        with open(transcript_file, 'r') as f:
            transcript_data = json.load(f)

        speaker_transcript = transcript_data.get('full_transcript', '')

        # Initialize LLM service
        llm_service = LLMService(openai_key)

        print(f"📋 Extracting action items...")
        action_items_result = llm_service.extract_action_items_by_speaker(speaker_transcript)

        print(f"✅ Action items extracted successfully")
        print(f"   Tokens used: {action_items_result['metadata'].get('tokens_used', 'unknown')}")

        # Show action items
        action_items = action_items_result['action_items']
        total_items = sum(len(items) for items in action_items.values())

        print(f"\n📋 Extracted Action Items (Total: {total_items}):")
        print("=" * 50)

        for speaker, items in action_items.items():
            if items:
                print(f"\n👤 {speaker.upper()}:")
                for i, item in enumerate(items, 1):
                    print(f"   {i}. {item['task']}")
                    print(f"      Deadline: {item['deadline']}")
                    print(f"      Priority: {item['priority']}")
                    if item.get('context'):
                        print(f"      Context: {item['context']}")

        print("=" * 50)

        # Save results
        save_llm_test_results({
            'test_type': 'action_items_extraction',
            'input_transcript_length': len(speaker_transcript),
            'total_action_items': total_items,
            'action_items_by_speaker': action_items,
            'metadata': action_items_result['metadata']
        })

        return True

    except Exception as e:
        print(f"❌ Action items extraction failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_speaker_specific_action_items():
    """Test speaker-specific action item extraction."""
    print("\n👤 Testing Speaker-Specific Action Items")
    print("=" * 50)

    # Check environment
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return False

    # Load test transcript
    test_results_dir = Path("data/test_results")
    transcript_file = test_results_dir / "transcription_speaker_annotated_transcription_results.json"

    if not transcript_file.exists():
        print("❌ Test transcript not found")
        return False

    try:
        with open(transcript_file, 'r') as f:
            transcript_data = json.load(f)

        speaker_transcript = transcript_data.get('full_transcript', '')

        # Initialize LLM service
        llm_service = LLMService(openai_key)

        # Extract participants
        participants = []
        lines = speaker_transcript.split('\n\n')
        for line in lines:
            if ':' in line:
                speaker = line.split(':', 1)[0].strip().strip('"\'')
                if speaker and not speaker.startswith('Unknown') and speaker not in participants:
                    participants.append(speaker)

        print(f"👥 Testing speaker-specific views for: {', '.join(participants)}")

        # Test each speaker's personalized view
        speaker_results = {}
        for speaker in participants:
            print(f"\n🔍 Testing {speaker}'s personalized view...")

            speaker_view = llm_service.extract_action_items_by_speaker(
                speaker_transcript, target_speaker=speaker
            )

            speaker_results[speaker] = speaker_view
            tokens_used = speaker_view['metadata'].get('tokens_used', 'unknown')

            print(f"   ✅ {speaker}'s view generated successfully")
            print(f"   🎯 View type: {speaker_view['metadata']['view_type']}")
            print(f"   💰 Tokens used: {tokens_used}")

            # Show speaker's action items
            action_items = speaker_view['action_items']
            speaker_items = action_items.get(speaker, [])
            total_items = sum(len(items) for items in action_items.values())

            print(f"   📋 Total action items in view: {total_items}")
            print(f"   🎯 {speaker}'s specific items: {len(speaker_items)}")

            if speaker_items:
                print(f"   📝 {speaker}'s tasks:")
                for i, item in enumerate(speaker_items[:2], 1):  # Show first 2
                    relevance = item.get('relevance', 'N/A')
                    print(f"      {i}. {item['task']} ({item['priority']} priority, {relevance})")

        # Save results
        save_llm_test_results({
            'test_type': 'speaker_specific_action_items',
            'participants_tested': participants,
            'speaker_results': {
                speaker: {
                    'tokens_used': result['metadata'].get('tokens_used'),
                    'view_type': result['metadata']['view_type'],
                    'target_speaker': result['metadata']['target_speaker'],
                    'total_items': sum(len(items) for items in result['action_items'].values()),
                    'speaker_specific_items': len(result['action_items'].get(speaker, []))
                }
                for speaker, result in speaker_results.items()
            }
        })

        print(f"\n✅ All speaker-specific views tested successfully!")
        return True

    except Exception as e:
        print(f"❌ Speaker-specific action items test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_all_action_item_views():
    """Test the n+1 views generation (general + all speaker-specific views)."""
    print("\n🔄 Testing All Action Item Views (n+1 Generation)")
    print("=" * 60)

    # Check environment
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return False

    # Load test transcript
    test_results_dir = Path("data/test_results")
    transcript_file = test_results_dir / "transcription_speaker_annotated_transcription_results.json"

    if not transcript_file.exists():
        print("❌ Test transcript not found")
        return False

    try:
        with open(transcript_file, 'r') as f:
            transcript_data = json.load(f)

        speaker_transcript = transcript_data.get('full_transcript', '')

        # Initialize LLM service
        llm_service = LLMService(openai_key)

        print(f"🔄 Generating all action item views (general + speaker-specific)...")
        all_views_result = llm_service.extract_all_action_item_views(speaker_transcript)

        total_tokens = all_views_result['metadata']['total_tokens_used']
        total_views = all_views_result['metadata']['total_views_generated']
        participants = all_views_result['metadata']['participants']

        print(f"✅ All views generated successfully!")
        print(f"   👥 Participants: {', '.join(participants)}")
        print(f"   📊 Total views generated: {total_views} (1 general + {len(participants)} speaker-specific)")
        print(f"   💰 Total tokens used: {total_tokens}")

        # Analyze general view
        general_view = all_views_result['general_view']
        general_items = sum(len(items) for items in general_view['action_items'].values())
        print(f"\n📋 General View Analysis:")
        print(f"   Total action items: {general_items}")
        print(f"   View type: {general_view['metadata']['view_type']}")

        # Analyze speaker-specific views
        print(f"\n👤 Speaker-Specific Views Analysis:")
        speaker_views = all_views_result['speaker_views']

        for speaker, view in speaker_views.items():
            speaker_items = sum(len(items) for items in view['action_items'].values())
            speaker_own_items = len(view['action_items'].get(speaker, []))
            tokens_used = view['metadata'].get('tokens_used', 'unknown')

            print(f"   🎯 {speaker}:")
            print(f"      Total items in view: {speaker_items}")
            print(f"      {speaker}'s specific items: {speaker_own_items}")
            print(f"      Tokens used: {tokens_used}")

        # Save comprehensive results
        save_llm_test_results({
            'test_type': 'all_action_item_views',
            'total_views_generated': total_views,
            'total_tokens_used': total_tokens,
            'participants': participants,
            'general_view_items': general_items,
            'speaker_views_analysis': {
                speaker: {
                    'total_items_in_view': sum(len(items) for items in view['action_items'].values()),
                    'speaker_specific_items': len(view['action_items'].get(speaker, [])),
                    'tokens_used': view['metadata'].get('tokens_used')
                }
                for speaker, view in speaker_views.items()
            },
            'metadata': all_views_result['metadata']
        })

        print(f"\n🎉 All action item views (n+1) test completed successfully!")
        return True

    except Exception as e:
        print(f"❌ All action item views test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_llm_comprehensive_insights():
    """Test comprehensive insights generation (summary + action items)."""
    print("\n🎯 Testing Comprehensive LLM Insights")
    print("=" * 50)

    # Check environment
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return False

    # Load test transcript
    test_results_dir = Path("data/test_results")
    transcript_file = test_results_dir / "transcription_speaker_annotated_transcription_results.json"

    if not transcript_file.exists():
        print("❌ Test transcript not found")
        return False

    try:
        with open(transcript_file, 'r') as f:
            transcript_data = json.load(f)

        speaker_transcript = transcript_data.get('full_transcript', '')

        # Initialize LLM service
        llm_service = LLMService(openai_key)

        print(f"🎯 Generating comprehensive insights...")
        insights = llm_service.generate_meeting_insights(
            speaker_transcript,
            {'duration': 1.5, 'participants_count': len(transcript_data.get('participants', []))}
        )

        total_tokens = insights['metadata']['total_tokens_used']
        print(f"✅ Comprehensive insights generated successfully")
        print(f"   Total tokens used: {total_tokens}")
        print(f"   Participants: {insights['participants']}")

        # Show both summary and action items
        print(f"\n🔍 COMPREHENSIVE INSIGHTS:")
        print("=" * 60)
        print("📝 SUMMARY:")
        print(insights['summary'])

        action_items = insights['action_items_by_speaker']
        total_items = sum(len(items) for items in action_items.values())

        print(f"\n📋 ACTION ITEMS (Total: {total_items}):")
        for speaker, items in action_items.items():
            if items:
                print(f"\n👤 {speaker.upper()}:")
                for i, item in enumerate(items, 1):
                    print(f"   {i}. {item['task']} ({item['priority']} priority)")

        print("=" * 60)

        # Save comprehensive results
        save_llm_test_results({
            'test_type': 'comprehensive_insights',
            'input_transcript_length': len(speaker_transcript),
            'summary': insights['summary'],
            'action_items_by_speaker': action_items,
            'participants': insights['participants'],
            'total_tokens_used': total_tokens,
            'metadata': insights['metadata']
        })

        return True

    except Exception as e:
        print(f"❌ Comprehensive insights generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def save_llm_test_results(results):
    """Save LLM test results."""
    output_dir = Path("data/test_results")
    output_dir.mkdir(exist_ok=True)

    result_file = output_dir / f"llm_{results['test_type']}_results.json"

    with open(result_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"📁 Results saved to: {result_file}")

if __name__ == "__main__":
    print("🤖 LLM Integration Test Suite")
    print("=" * 70)
    print("ℹ️  Testing OpenAI integration for summaries and action items")
    print()

    # Test 1: Summary generation
    summary_success = test_llm_summary_generation()

    # Test 2: Action items extraction (general)
    action_items_success = test_llm_action_items_extraction()

    # Test 3: Speaker-specific action items
    speaker_specific_success = test_speaker_specific_action_items()

    # Test 4: All action item views (n+1)
    all_views_success = test_all_action_item_views()

    # Test 5: Comprehensive insights
    comprehensive_success = test_llm_comprehensive_insights()

    # Summary
    print(f"\n📊 Test Summary:")
    print(f"   Summary generation: {'✅' if summary_success else '❌'}")
    print(f"   Action items extraction (general): {'✅' if action_items_success else '❌'}")
    print(f"   Speaker-specific action items: {'✅' if speaker_specific_success else '❌'}")
    print(f"   All action item views (n+1): {'✅' if all_views_success else '❌'}")
    print(f"   Comprehensive insights: {'✅' if comprehensive_success else '❌'}")

    all_tests_passed = all([
        summary_success,
        action_items_success,
        speaker_specific_success,
        all_views_success,
        comprehensive_success
    ])

    if all_tests_passed:
        print(f"\n🎉 All LLM integration tests PASSED!")
        print("   Phase 2 (LLM Integration) with speaker-specific views is now complete!")
        exit(0)
    else:
        print(f"\n❌ Some LLM integration tests FAILED!")
        exit(1)