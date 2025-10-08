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

        prompt = f"""You are an expert meeting summarizer. Summarize this meeting transcript as a concise, structured brief for busy stakeholders.

**Empty Transcript Handling**: If the transcript is empty or contains no meaningful content, respond with:

"It seems like both the transcript and notes are empty. This could be because:
* You may have started a recording but didn't speak
* There might have been a technical issue with the recording
* You might be testing this feature for the first time

To get the most out of AI Meeting Notes, try recording a longer conversation or meeting. With more content, I can:
* Create a comprehensive summary of the discussion
* Identify key decisions and action items
* Organize information in a clear, readable format
* Enhance any notes you take during the meeting

Feel free to try again with a longer recording. I'm here to help turn your meetings into well-organized, actionable notes!"

**Structure**:
- Organize content into 3–6 thematic sections with clear headers
- Create section titles that reflect the actual discussion topics (for example, sections might include things like background information, current status updates, strategic discussions, obstacles or concerns, decisions made, or follow-up items)
- Always include an Action Items section formatted as checkboxes using "[ ]"

**Content Guidelines**:
- Extract key decisions, insights, and takeaways
- Include specific names, companies, dates, and numbers when mentioned
- Focus on outcomes and next steps rather than conversational flow
- Capture the main topics discussed and conclusions reached
- Turn explicit follow-ups into action item checkboxes
- Do not invent tasks or owners not stated in the meeting

**Style**:
- Be factual and neutral
- Use concise, skimmable bullet points
- Prefer verb-led bullets where appropriate
- Remove conversational filler and tangents
- Present information logically, not necessarily chronologically
- Professional and clear tone

Do not include timestamps or a chronological account of the conversation. Instead, synthesize the discussion into actionable insights and clear takeaways.

{duration_info}Participants: {', '.join(participants)}

Meeting Transcript:
{speaker_annotated_transcript}{user_notes_section}"""

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

    # Action items are now included in the main summary generation
    # Separate action item extraction methods removed

    # All separate action item generation methods removed
    # Action items are now included in the main summary generation

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