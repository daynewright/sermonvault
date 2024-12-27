import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SermonData, SERMON_TYPES, SERMON_TAGS } from '@/types/sermonData';
import { useSermons, useUpdateSermon } from '@/hooks/fetch/use-sermons';
import { useToast } from '@/hooks/use-toast';

export const UploadSermonConfirmationForm = ({
  setDialogOpen,
  clearSermonData,
  initialData,
}: {
  setDialogOpen: (open: boolean) => void;
  clearSermonData: () => void;
  initialData: SermonData;
}) => {
  const [formData, setFormData] = useState<SermonData>(initialData);
  const { mutateAsync: updateSermon, isPending } = useUpdateSermon();
  const { refetch: refetchSermons } = useSermons();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await updateSermon({
        sermonId: formData.id.value as string,
        data: Object.keys(formData).reduce((acc, key) => {
          acc[key as keyof SermonData] =
            formData[key as keyof SermonData].value;
          return acc;
        }, {} as { [key in keyof SermonData]: SermonData[key]['value'] }),
      });

      if (response.ok) {
        refetchSermons();
        toast({
          title: 'Sermon updated successfully',
          description:
            'Your sermon has been updated and is ready to be reviewed.',
        });
      } else {
        toast({
          title: 'Error',
          variant: 'destructive',
          description:
            'There was an error updating your sermon. But the data was saved and you can try again later.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description:
          'There was an error updating your sermon. But the data was saved and you can try again later.',
      });
    }
    setDialogOpen(false);
    clearSermonData();
  };

  const getConfidenceIndicator = (confidence: number) => {
    if (confidence > 0.75) {
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        label: 'High confidence',
      };
    }
    if (confidence > 0.5) {
      return {
        icon: HelpCircle,
        color: 'text-orange-500',
        label: 'Medium confidence',
      };
    }
    if (confidence > 0.25) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-500',
        label: 'Low confidence',
      };
    }
    return {
      icon: AlertCircle,
      color: 'text-red-500',
      label: 'Very low confidence',
    };
  };

  const renderField = (
    label: string,
    field: keyof SermonData,
    type: 'text' | 'array' | 'textarea' | 'date' | 'select' | 'tags' = 'text'
  ) => {
    const {
      icon: Icon,
      color,
      label: confidenceLabel,
    } = getConfidenceIndicator(formData[field].confidence);

    return (
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={field}>{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Icon className={`h-4 w-4 ${color}`} />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {confidenceLabel} (
                  {(formData[field].confidence * 100).toFixed(0)}%)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {type === 'tags' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {Array.isArray(formData[field].value) &&
                formData[field].value.map((tag) => (
                  <Badge key={tag} variant="secondary" className="mr-1">
                    {tag}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => {
                        const currentTags = Array.isArray(formData[field].value)
                          ? (formData[field].value as string[])
                          : [];
                        setFormData({
                          ...formData,
                          [field]: {
                            ...formData[field],
                            value: currentTags.filter((t) => t !== tag),
                          },
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Badge>
                ))}
            </div>
            <Select
              disabled={
                Array.isArray(formData[field].value) &&
                formData[field].value.length >= 3
              }
              value={''}
              onValueChange={(value) => {
                const currentTags = Array.isArray(formData[field].value)
                  ? (formData[field].value as string[])
                  : [];
                if (!currentTags.includes(value) && currentTags.length < 3) {
                  setFormData({
                    ...formData,
                    [field]: {
                      ...formData[field],
                      value: [...currentTags, value],
                    },
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tags (max 3)" />
              </SelectTrigger>
              <SelectContent>
                {SERMON_TAGS.map((tag) => (
                  <SelectItem
                    key={tag}
                    value={tag}
                    disabled={
                      Array.isArray(formData[field].value) &&
                      (formData[field].value as string[]).includes(tag)
                    }
                  >
                    {tag
                      .split('-')
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Select up to 3 tags</p>
          </div>
        ) : type === 'select' ? (
          <Select
            value={formData[field].value as string}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                [field]: { ...formData[field], value },
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sermon type" />
            </SelectTrigger>
            <SelectContent>
              {SERMON_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {/* Capitalize first letter for display */}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === 'date' ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData[field].value && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData[field].value ? (
                  format(new Date(formData[field].value as string), 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  formData[field].value
                    ? new Date(formData[field].value as string)
                    : undefined
                }
                onSelect={(date) =>
                  setFormData({
                    ...formData,
                    [field]: {
                      ...formData[field],
                      value: date?.toISOString() || null,
                    },
                  })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ) : type === 'array' ? (
          <div className="grid gap-1.5">
            <Input
              id={field}
              value={
                Array.isArray(formData[field].value)
                  ? formData[field].value.join(', ')
                  : ''
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [field]: {
                    ...formData[field],
                    value: e.target.value.split(',').map((item) => item.trim()),
                  },
                })
              }
              placeholder="Separate multiple items with commas"
            />
            <p className="text-sm text-muted-foreground">
              Enter multiple items separated by commas (e.g., item1, item2,
              item3)
            </p>
          </div>
        ) : type === 'textarea' ? (
          <Textarea
            id={field}
            value={(formData[field].value as string) || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                [field]: { ...formData[field], value: e.target.value },
              })
            }
            className="min-h-[100px]"
          />
        ) : (
          <Input
            id={field}
            value={(formData[field].value as string) || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                [field]: { ...formData[field], value: e.target.value },
              })
            }
          />
        )}
      </div>
    );
  };

  return (
    <>
      <DialogTitle className="text-xl font-semibold">
        Confirm Sermon Information
      </DialogTitle>
      <DialogDescription className="mt-2 mb-4 text-sm text-muted-foreground">
        Please review and confirm some high level details about the sermon. You
        can hover over the icons to see the confidence score. This information
        will be used to answer questions about the sermon and help with
        reporting, analytics, and more. The full sermon text will also be stored
        and used, this just allows us to get more context about the sermon if it
        is available.
      </DialogDescription>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-medium text-lg border-b pb-2">
                Core Information
              </h3>
              {renderField('Title', 'title')}
              {renderField('Preacher', 'preacher')}
              {renderField('Date', 'date', 'date')}
              {renderField('Primary Scripture', 'primary_scripture')}
              {renderField('Sermon Type', 'sermon_type', 'select')}
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-medium text-lg border-b pb-2">
                Content Details
              </h3>
              {renderField('Key Points', 'key_points', 'textarea')}
              {renderField('Illustrations', 'illustrations', 'textarea')}
              {renderField('Summary', 'summary', 'textarea')}
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-medium text-lg border-b pb-2">
                Scripture & Themes
              </h3>
              {renderField('Scriptures', 'scriptures', 'array')}
              {renderField('Themes', 'themes', 'array')}
              {renderField('Topics', 'topics', 'array')}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-medium text-lg border-b pb-2">
                Narrative Elements
              </h3>
              {renderField('Personal Stories', 'personal_stories', 'textarea')}
              {renderField('Mentioned People', 'mentioned_people', 'array')}
              {renderField('Mentioned Events', 'mentioned_events', 'array')}
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-medium text-lg border-b pb-2">Engagement</h3>
              {renderField('Calls to Action', 'calls_to_action', 'array')}
              {renderField('Tone', 'tone')}
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-medium text-lg border-b pb-2">
                Additional Metadata
              </h3>
              {renderField('Tags', 'tags', 'tags')}
              {renderField('Series', 'series')}
              {renderField('Location', 'location')}
              {renderField('Keywords', 'keywords', 'array')}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </form>
    </>
  );
};
