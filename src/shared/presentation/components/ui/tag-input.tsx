'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Badge } from './badge'
import { cn } from '@/shared/lib/utils'

interface TagInputProps {
  value?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TagInput({ 
  value = [], 
  onChange,
  onChangeString,
  placeholder = "Escribe y pulsa Enter...", 
  className,
  disabled 
}: TagInputProps & { onChangeString?: (value: string) => void }) {
  const [inputValue, setInputValue] = React.useState('')
  
  const tags = Array.isArray(value) ? value : (value as string).split(',').filter(Boolean)

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const bridge = [...tags, trimmedTag]
      onChange?.(bridge)
      onChangeString?.(bridge.join(','))
    }
    setInputValue('')
  }

  const handleRemoveTag = (index: number) => {
    const bridge = tags.filter((_, i) => i !== index)
    onChange?.(bridge)
    onChangeString?.(bridge.join(','))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      handleRemoveTag(tags.length - 1)
    }
  }

  return (
    <div 
      className={cn(
        "flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-foreground/5 min-h-[44px] transition-all focus-within:ring-1 focus-within:ring-primary shadow-sm",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {tags.map((tag, i) => (
        <Badge 
          key={`${tag}-${i}`} 
          variant="secondary" 
          className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-[13px] font-medium animate-in zoom-in-50 duration-200 bg-primary/10 text-primary border-none"
        >
          {tag}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleRemoveTag(i)}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
          >
            <X size={12} />
          </button>
        </Badge>
      ))}
      <input
        type="text"
        disabled={disabled}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue) handleAddTag(inputValue)
        }}
        placeholder={tags.length > 0 ? "" : placeholder}
        className="flex-1 bg-transparent border-none focus:ring-0 text-sm h-7 placeholder:font-light min-w-[120px] outline-none text-foreground"
      />
    </div>
  )
}
