"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Users, X, AtSign } from 'lucide-react';
import { apiService } from '@/lib/api';

interface ParticipantInputProps {
  participants: string[];
  onParticipantsChange: (participants: string[]) => void;
}

interface SuggestionItem { name: string; avatar: string }

export const ParticipantInput = ({ participants, onParticipantsChange }: ParticipantInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState<SuggestionItem[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load registered speakers from backend
  useEffect(() => {
    setIsLoadingSpeakers(true);
    apiService.getSpeakers().then((speakers) => {
      const mapped = speakers.map(s => ({ 
        name: s.name, 
        avatar: s.metadata?.profilePhoto || '/Notion_AI_Face.png'
      }));
      setAllSuggestions(mapped);
      setFilteredSuggestions(mapped.filter(p => !participants.includes(p.name)));
    }).catch(() => {
      setAllSuggestions([]);
      setFilteredSuggestions([]);
    }).finally(() => {
      setIsLoadingSpeakers(false);
    });
  }, [participants]);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allSuggestions.filter(person =>
        person.name.toLowerCase().includes(inputValue.toLowerCase())
      ).filter(person => !participants.includes(person.name));
      
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions(allSuggestions.filter(person => !participants.includes(person.name)));
      setShowSuggestions(false);
    }
  }, [inputValue, participants, allSuggestions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Show suggestions when typing @ or when there's text
    if (value.includes('@') || value.trim()) {
      setShowSuggestions(true);
    }
  };

  // Add participant
  const addParticipant = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !participants.includes(trimmedName)) {
      onParticipantsChange([...participants, trimmedName]);
    }
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Remove participant
  const removeParticipant = (name: string) => {
    onParticipantsChange(participants.filter(p => p !== name));
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        addParticipant(filteredSuggestions[0].name);
      } else {
        // Add custom participant name
        addParticipant(inputValue.trim());
      }
    }
    
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-base font-medium text-[#9B9B9B]">
        <Users className="w-5 h-5" />
        <span>Meeting Participants</span>
      </div>
      
      {/* Participant Tags */}
      {participants.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {participants.map((participant, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {participant}
              <button
                onClick={() => removeParticipant(participant)}
                className="ml-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onFocus={() => {
              if (inputValue.trim() || filteredSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Type @ to mention participants or add names..."
            className="w-full px-4 pr-12 border border-[#E5E5E5] rounded-lg bg-[#FAFAFA] text-[#1A1A1A] placeholder-[#9B9B9B] focus:ring-0 focus:border-[#9B9B9B] focus:outline-none"
            style={{ fontSize: '15px', height: '50px', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.04em' }}
          />
          <AtSign className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#B8B8B8]" />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {isLoadingSpeakers ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Loading speakers...
              </div>
            ) : filteredSuggestions.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  Suggested Participants
                </div>
                {filteredSuggestions.map((person, index) => (
                  <button
                    key={index}
                    onClick={() => addParticipant(person.name)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                  >
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/Notion_AI_Face.png'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {person.name}
                      </div>
                      <div className="text-[10px] text-green-700 bg-green-50 rounded px-1 py-0.5 inline-block">Registered</div>
                    </div>
                  </button>
                ))}
              </>
            ) : inputValue.trim() ? (
              <button
                onClick={() => addParticipant(inputValue.trim())}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
              >
                <img
                  src={'/Notion_AI_Face.png'}
                  alt="Unknown"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Add &quot;{inputValue.trim()}&quot;
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Press Enter to add
                  </div>
                </div>
              </button>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No participants found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="mt-3" style={{ fontSize: '15px', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.04em', color: '#9B9B9B' }}>
        Add participants to help identify speakers in the transcript. Type @ to see suggestions.
      </p>
    </div>
  );
};
