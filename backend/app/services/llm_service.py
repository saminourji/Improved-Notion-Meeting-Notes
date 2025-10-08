"""LLM service for generating meeting summaries and action items using OpenAI Responses API."""

import openai
from typing import Dict, List, Optional, Any
import structlog
from pathlib import Path
import json
import os

logger = structlog.get_logger(__name__)


class LLMService:
    """Service for generating meeting summaries and action items using OpenAI Responses API."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        """Initialize LLM service with OpenAI configuration."""
        # Clear any proxy environment variables to avoid conflicts
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
        for var in proxy_vars:
            if var in os.environ:
                del os.environ[var]

        # Set API key
        os.environ["OPENAI_API_KEY"] = api_key

        # Initialize OpenAI client with explicit http client to avoid proxy issues
        import httpx
        http_client = httpx.Client()
        self.client = openai.OpenAI(api_key=api_key, http_client=http_client)
        self.model = model

        logger.info("llm_service_initialized",
                   model=model)

    def generate_meeting_summary(self, speaker_annotated_transcript: str,
                                meeting_metadata: Optional[Dict] = None,
                                user_notes: Optional[str] = None) -> Dict[str, Any]:
        """Generate a comprehensive meeting summary from speaker-annotated transcript.

        Args:
            speaker_annotated_transcript: Full transcript with speaker annotations
            meeting_metadata: Optional metadata (duration, participants, etc.)
            user_notes: Optional user-provided notes to incorporate into summary

        Returns:
            Dict containing summary, key points, decisions, and next steps
        """
        logger.info("generating_meeting_summary",
                   transcript_length=len(speaker_annotated_transcript))

        # Prepare context
        participants = self._extract_participants(speaker_annotated_transcript)
        duration_info = ""
        if meeting_metadata and 'duration' in meeting_metadata:
            duration_info = f"Meeting duration: {meeting_metadata['duration']:.1f} minutes\n"

        # Include user notes if provided
        user_notes_section = ""
        if user_notes:
            user_notes_section = f"""

Additional User Notes to Incorporate:
{user_notes}

Please integrate relevant information from these user notes into the appropriate sections of the summary."""

        prompt = f"""You are an AI assistant that creates professional meeting summaries.

{duration_info}Participants: {', '.join(participants)}

Please analyze the following meeting transcript and provide a comprehensive summary:

{speaker_annotated_transcript}{user_notes_section}

Generate a structured summary with the following sections in markdown format:

## Executive Summary
(2-3 sentences overview)

## Key Discussion Points
- Main topic 1
- Main topic 2
- Main topic 3

## [Topic Name 1]
(Detailed discussion of major topic - maximum 3 topical sections)

## [Topic Name 2]
(Detailed discussion of major topic - maximum 3 topical sections)

## [Topic Name 3]
(Detailed discussion of major topic - maximum 3 topical sections)

## Action Items
- [ ] Task description (Assigned to: Speaker Name, Deadline: if specified)
- [ ] Task description (Assigned to: Speaker Name, Deadline: if specified)

## Next Steps
- Next meeting or follow-up item
- Deadlines and important dates

FORMATTING REQUIREMENTS:
- Use markdown format with proper headers (## for main sections, ### for subsections if needed)
- Use bullet points (-) for lists
- Use checkboxes (- [ ]) for action items
- DO NOT use emojis unless they are directly relevant to the meeting content
- Be professional, concise, and actionable
- Focus on concrete outcomes and decisions rather than conversational details
- Create 1-3 topical sections based on the main themes discussed (beyond standard sections)
- When referring to a participant or speaker, prefix their name with @ (e.g., @Sami, @Aadil). Use exact names if available from the transcript
- For action items, include clear assignee and deadline information when available"""

        try:
            # Log the prompt being sent to OpenAI
            logger.info("sending_summary_prompt_to_openai",
                       model=self.model,
                       prompt_length=len(prompt),
                       transcript_length=len(speaker_annotated_transcript),
                       participants=participants)
            
            # Use chat completions API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,  # Lower temperature for consistent, factual summaries
                max_tokens=1500
            )
            summary_content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if response.usage else None

            # Log the raw response from OpenAI
            logger.info("received_summary_response_from_openai",
                       response_length=len(summary_content),
                       tokens_used=tokens_used,
                       raw_response=summary_content)

            # Parse the structured response
            result = {
                "summary": summary_content,
                "participants": participants,
                "metadata": {
                    "model_used": self.model,
                    "api_used": "chat_completions",
                    "transcript_length": len(speaker_annotated_transcript),
                    "participants_count": len(participants),
                    "tokens_used": tokens_used
                }
            }

            logger.info("meeting_summary_generated",
                       participants_count=len(participants),
                       tokens_used=tokens_used,
                       api_used="chat_completions",
                       summary_word_count=len(summary_content.split()),
                       summary_length=len(summary_content))

            return result

        except Exception as e:
            logger.error("meeting_summary_generation_failed", error=str(e))
            raise RuntimeError(f"Failed to generate meeting summary: {str(e)}")

    def extract_action_items_by_speaker(self, speaker_annotated_transcript: str,
                                        target_speaker: Optional[str] = None,
                                        user_notes: Optional[str] = None) -> Dict[str, List[Dict]]:
        """Extract action items and assign them to specific speakers.

        Args:
            speaker_annotated_transcript: Full transcript with speaker annotations
            target_speaker: If provided, focus on this speaker's action items (personalized view)
            user_notes: Optional user-provided notes to incorporate into action items

        Returns:
            Dict mapping speaker names to their assigned action items
        """
        logger.info("extracting_action_items",
                   transcript_length=len(speaker_annotated_transcript))

        participants = self._extract_participants(speaker_annotated_transcript)

        # Include user notes if provided
        user_notes_section = ""
        if user_notes:
            user_notes_section = f"""

Additional User Notes to Incorporate:
{user_notes}

Please consider these user notes when identifying and prioritizing action items."""

        # Customize prompt based on whether this is a speaker-specific view
        if target_speaker:
            focus_instruction = f"""

SPECIAL FOCUS: This request is for {target_speaker}'s personalized view.
- Prioritize and elaborate on {target_speaker}'s action items
- Include context that helps {target_speaker} understand their responsibilities
- Still include other speakers' items, but with less detail
- Add "relevance" field indicating if each item is primary responsibility of {target_speaker}"""
            view_type = "speaker-specific"
            comma_separator = ","
            relevance_field = '"relevance": "primary|secondary" // primary if this speaker\'s main responsibility'
        else:
            focus_instruction = ""
            view_type = "general"
            comma_separator = ""
            relevance_field = ""

        prompt = f"""You are an AI assistant specialized in extracting action items from meeting transcripts.

Participants: {', '.join(participants)}
View Type: {view_type.title()} Action Items{f' for {target_speaker}' if target_speaker else ''}

Analyze the following meeting transcript and extract all action items:

{speaker_annotated_transcript}{user_notes_section}

For each action item, determine:
1. What specific task needs to be done
2. Who is responsible (if mentioned or implied)
3. Any mentioned deadlines or timeframes (embed directly in task description if explicitly mentioned)
4. Clear, actionable description{focus_instruction}

FORMATTING REQUIREMENTS:
- DO NOT use emojis unless they are directly relevant to the meeting content
- Use professional, business-appropriate language
- Be specific and actionable in task descriptions
- Focus on concrete outcomes and commitments
- Embed deadline/priority information directly in the task string if explicitly mentioned

Return your response in JSON format with this structure:
{{
  "Sami": ["Task description with deadline if mentioned"],
  "Aadil": ["Another task description"],
  "Everyone": ["Optional: tasks for whole group"],
  "Other": ["Optional: unassigned tasks"]
}}

IMPORTANT SCHEMA NOTES:
- Use exact participant names as keys (e.g., "Sami", "Aadil", etc.)
- Include "Everyone" key only if there are group-wide tasks that apply to all participants
- Include "Other" key only if there are unassigned tasks where no clear owner was identified
- Each task should be a simple string - embed deadline/priority information directly in the task description if explicitly mentioned
- Do not use strict schema for deadlines/priorities - only include if explicitly mentioned in the meeting

Only include actual action items and commitments, not general discussion points. If someone volunteers for something or is asked to do something, assign it to them."""

        try:
            # Log the prompt being sent to OpenAI
            logger.info("sending_action_items_prompt_to_openai",
                       model=self.model,
                       prompt_length=len(prompt),
                       target_speaker=target_speaker,
                       participants=participants)
            
            # Use chat completions API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,  # Very low temperature for structured extraction
                max_tokens=1000
            )
            action_items_text = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if response.usage else None

            # Log the raw response from OpenAI
            logger.info("received_action_items_response_from_openai",
                       response_length=len(action_items_text),
                       tokens_used=tokens_used,
                       raw_response=action_items_text)

            # Try to extract JSON from the response
            try:
                # Look for JSON block
                if "```json" in action_items_text:
                    json_start = action_items_text.find("```json") + 7
                    json_end = action_items_text.find("```", json_start)
                    json_text = action_items_text[json_start:json_end].strip()
                else:
                    # Assume the whole response is JSON
                    json_text = action_items_text.strip()

                action_items = json.loads(json_text)
                
                # Log the parsed action items structure
                logger.info("action_items_json_parsed_successfully",
                           action_items_structure=action_items,
                           total_speakers_with_items=len(action_items),
                           total_items=sum(len(items) for items in action_items.values()))

            except json.JSONDecodeError as je:
                logger.warning("failed_to_parse_action_items_json",
                              error=str(je),
                              full_response_text=action_items_text,
                              json_attempt=json_text if 'json_text' in locals() else 'N/A')
                # Fallback: return a simplified structure
                action_items = {
                    "Other": ["Failed to parse action items - please review meeting manually"]
                }

            # Add metadata
            result = {
                "action_items": action_items,
                "metadata": {
                    "model_used": self.model,
                    "api_used": "chat_completions",
                    "participants": participants,
                    "extraction_method": "llm_structured",
                    "view_type": view_type,
                    "target_speaker": target_speaker,
                    "tokens_used": tokens_used
                }
            }

            # Count total action items
            total_items = sum(len(items) for items in action_items.values())
            logger.info("action_items_extracted",
                       total_items=total_items,
                       tokens_used=tokens_used,
                       api_used="chat_completions")

            return result

        except Exception as e:
            logger.error("action_items_extraction_failed", error=str(e))
            raise RuntimeError(f"Failed to extract action items: {str(e)}")

    def extract_all_action_item_views(self, speaker_annotated_transcript: str,
                                      user_notes: Optional[str] = None) -> Dict[str, Any]:
        """Generate all action item views: general + one for each speaker.

        Args:
            speaker_annotated_transcript: Full transcript with speaker annotations
            user_notes: Optional user-provided notes to incorporate into action items

        Returns:
            Dict containing general view and speaker-specific views
        """
        logger.info("extracting_all_action_item_views",
                   transcript_length=len(speaker_annotated_transcript))

        participants = self._extract_participants(speaker_annotated_transcript)

        # Generate general view (existing behavior)
        general_view = self.extract_action_items_by_speaker(speaker_annotated_transcript, user_notes=user_notes)

        # Generate speaker-specific views
        speaker_views = {}
        total_tokens = general_view["metadata"].get("tokens_used", 0) or 0

        for speaker in participants:
            logger.info("generating_speaker_specific_view", speaker=speaker)
            try:
                speaker_view = self.extract_action_items_by_speaker(
                    speaker_annotated_transcript, target_speaker=speaker, user_notes=user_notes
                )
                speaker_views[speaker] = speaker_view
                total_tokens += speaker_view["metadata"].get("tokens_used", 0) or 0

            except Exception as e:
                logger.error("speaker_view_generation_failed", speaker=speaker, error=str(e))
                # Create fallback view for this speaker
                speaker_views[speaker] = {
                    "action_items": general_view["action_items"],
                    "metadata": {
                        **general_view["metadata"],
                        "view_type": "speaker-specific",
                        "target_speaker": speaker,
                        "error": f"Failed to generate personalized view: {str(e)}"
                    }
                }

        result = {
            "general_view": general_view,
            "speaker_views": speaker_views,
            "metadata": {
                "total_speakers": len(participants),
                "total_views_generated": 1 + len(participants),
                "participants": participants,
                "total_tokens_used": total_tokens,
                "generation_method": "n_plus_1_views"
            }
        }

        logger.info("all_action_item_views_generated",
                   total_views=1 + len(participants),
                   participants_count=len(participants),
                   total_tokens=total_tokens)

        return result

    def generate_meeting_insights(self, speaker_annotated_transcript: str,
                                 meeting_metadata: Optional[Dict] = None,
                                 user_notes: Optional[str] = None) -> Dict[str, Any]:
        """Generate comprehensive meeting insights including summary and action items.

        Args:
            speaker_annotated_transcript: Full transcript with speaker annotations
            meeting_metadata: Optional metadata (duration, participants, etc.)
            user_notes: Optional user-provided notes to incorporate into insights

        Returns:
            Dict containing both summary and action items
        """
        logger.info("generating_comprehensive_meeting_insights")

        try:
            # Generate summary and action items in parallel conceptually
            summary_result = self.generate_meeting_summary(
                speaker_annotated_transcript, meeting_metadata, user_notes
            )

            action_items_result = self.extract_action_items_by_speaker(
                speaker_annotated_transcript, user_notes=user_notes
            )

            # Combine results
            insights = {
                "summary": summary_result["summary"],
                "action_items_by_speaker": action_items_result["action_items"],
                "participants": summary_result["participants"],
                "metadata": {
                    "summary_metadata": summary_result["metadata"],
                    "action_items_metadata": action_items_result["metadata"],
                    "total_tokens_used": (
                        (summary_result["metadata"].get("tokens_used", 0) or 0) +
                        (action_items_result["metadata"].get("tokens_used", 0) or 0)
                    )
                }
            }

            logger.info("comprehensive_meeting_insights_generated",
                       total_tokens=insights["metadata"]["total_tokens_used"])

            return insights

        except Exception as e:
            logger.error("comprehensive_insights_generation_failed", error=str(e))
            raise RuntimeError(f"Failed to generate meeting insights: {str(e)}")

    def _extract_participants(self, speaker_annotated_transcript: str) -> List[str]:
        """Extract unique participant names from speaker-annotated transcript."""
        participants = set()

        # Split transcript by speaker turns
        lines = speaker_annotated_transcript.split('\n\n')

        for line in lines:
            line = line.strip()
            if ':' in line:
                # Extract speaker name (everything before the first colon)
                speaker = line.split(':', 1)[0].strip()
                # Remove quotes if present
                speaker = speaker.strip('"\'')

                # Filter out obvious non-names
                if speaker and not speaker.startswith('Unknown') and len(speaker) > 1:
                    participants.add(speaker)

        return sorted(list(participants))