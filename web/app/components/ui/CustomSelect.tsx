'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
  description?: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value)
          setIsOpen(false)
        } else {
          setIsOpen(true)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 bg-surface-300 border rounded-lg text-left
          flex items-center justify-between gap-2 transition-all duration-200
          ${isOpen ? 'border-primary/50 ring-1 ring-primary/30' : 'border-white/10 hover:border-white/20'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={selectedOption ? 'text-white' : 'text-white/40'}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          className="
            absolute z-50 w-full mt-2 py-1 rounded-lg overflow-hidden
            bg-surface-300/95 backdrop-blur-xl border border-white/10
            shadow-2xl shadow-black/50 max-h-64 overflow-y-auto
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isHighlighted = index === highlightedIndex

            return (
              <li
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  px-4 py-2.5 cursor-pointer transition-all duration-150
                  ${isSelected
                    ? 'bg-gradient-to-r from-primary/20 to-accent/10 text-primary'
                    : isHighlighted
                    ? 'bg-white/10 text-white'
                    : 'text-white/80 hover:bg-white/5'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {option.description && (
                  <p className="text-xs text-white/40 mt-0.5">{option.description}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
