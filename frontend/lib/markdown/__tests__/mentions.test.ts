/**
 * Tests for mention highlighting functionality
 */

import { highlightMentions, processMarkdownWithMentions } from '../mentions';

describe('Mention Highlighting', () => {
  describe('highlightMentions', () => {
    it('should highlight valid @mentions', () => {
      const text = 'Hello @Sami, how are you? @Aadil mentioned something.';
      const result = highlightMentions(text);
      
      // Check that the result contains React elements for mentions
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(1);
    });

    it('should not highlight mentions in emails', () => {
      const text = 'Contact me at sami@example.com or aadil@company.org';
      const result = highlightMentions(text);
      
      // Should not contain React elements for email addresses
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // Should be just the original text
    });

    it('should handle mixed content correctly', () => {
      const text = '@Sami said to email john@company.com and @Aadil agreed.';
      const result = highlightMentions(text);
      
      expect(Array.isArray(result)).toBe(true);
      // Should highlight @Sami and @Aadil but not john@company.com
    });

    it('should handle text without mentions', () => {
      const text = 'This is just regular text without any mentions.';
      const result = highlightMentions(text);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(text);
    });

    it('should handle empty text', () => {
      const result = highlightMentions('');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('');
    });
  });

  describe('processMarkdownWithMentions', () => {
    it('should process HTML-style mentions', () => {
      const text = 'Hello @Sami and @Aadil!';
      const result = processMarkdownWithMentions(text);
      
      expect(result).toContain('<span style="color: #9B9B9B; font-weight: 600;">@Sami</span>');
      expect(result).toContain('<span style="color: #9B9B9B; font-weight: 600;">@Aadil</span>');
    });

    it('should not process email addresses', () => {
      const text = 'Email me at sami@example.com';
      const result = processMarkdownWithMentions(text);
      
      expect(result).toBe(text); // Should remain unchanged
    });
  });
});
