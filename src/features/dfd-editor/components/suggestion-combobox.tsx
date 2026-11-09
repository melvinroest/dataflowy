import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface SuggestionComboboxProps {
  value: string
  onChange: (value: string) => void
  suggestions: { value: string; label: string }[]
  placeholder?: string
}

export function SuggestionCombobox({
  value,
  onChange,
  suggestions,
  placeholder = 'Select or type...',
}: SuggestionComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedLabel = suggestions.find((s) => s.value === value)?.label || value

  const filtered = suggestions.filter(
    (s) =>
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.value.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue === value ? '' : selectedValue)
    setOpen(false)
    setSearch('')
  }

  const handleCustomValue = () => {
    if (search.trim()) {
      onChange(search.trim())
      setOpen(false)
      setSearch('')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="truncate">{selectedLabel}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type custom..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !search.trim() && (
              <CommandEmpty>No suggestions found.</CommandEmpty>
            )}
            {search.trim() && !filtered.some((s) => s.value === search.trim()) && (
              <CommandGroup heading="Custom">
                <CommandItem value={`custom-${search}`} onSelect={handleCustomValue}>
                  <Check className={cn('mr-2 h-4 w-4', value === search.trim() ? 'opacity-100' : 'opacity-0')} />
                  Use &quot;{search.trim()}&quot;
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.length > 0 && (
              <CommandGroup heading="Suggestions">
                {filtered.map((suggestion) => (
                  <CommandItem
                    key={suggestion.value}
                    value={suggestion.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === suggestion.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {suggestion.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
