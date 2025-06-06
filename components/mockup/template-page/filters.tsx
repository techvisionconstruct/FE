import React from 'react'
import { 
  TabsList, 
  TabsTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared"
import { Search } from "lucide-react"

interface TemplateFiltersProps {
  onSearch?: (query: string) => void;
  onSort?: (sortOption: string) => void;
}

export const Filters: React.FC<TemplateFiltersProps> = ({
  onSearch,
  onSort
}) => {
  return (
    <div className="flex items-center justify-between">
      <TabsList>
        <TabsTrigger value="all">All Templates</TabsTrigger>
        <TabsTrigger value="my-templates">My Templates</TabsTrigger>
        <TabsTrigger value="global-templates">Global Templates</TabsTrigger>
      </TabsList>
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search templates..."
            className="w-[200px] pl-8 rounded-full"
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        </div>
        <Select onValueChange={(value) => onSort && onSort(value)}>
          <SelectTrigger className="w-[180px] rounded-full">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Updated</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="most-used">Most Used</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
