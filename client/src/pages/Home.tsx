import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { 
  Link2, Copy, ExternalLink, RefreshCw, Wand2, 
  Youtube, Instagram, MapPin, Twitter, Phone, Info 
} from "lucide-react";

import { useGenerateLink } from "@/hooks/use-generator";
import { trackEvent } from "@/lib/gtm";
import { generateLinkSchema } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type FormValues = z.infer<typeof generateLinkSchema>;

const PLATFORMS = [
  { id: "youtube", name: "YouTube", icon: Youtube, color: "text-red-500" },
  { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500" },
  { id: "whatsapp", name: "WhatsApp", icon: Phone, color: "text-green-500" },
  { id: "google_maps", name: "Google Maps", icon: MapPin, color: "text-blue-500" },
  { id: "twitter", name: "Twitter / X", icon: Twitter, color: "text-sky-500" },
] as const;

export default function Home() {
  const [autoDetect, setAutoDetect] = useState(true);
  const [result, setResult] = useState<{ link: string; notes?: string } | null>(null);
  const { toast } = useToast();
  
  const generate = useGenerateLink();

  const form = useForm<FormValues>({
    resolver: zodResolver(generateLinkSchema),
    defaultValues: {
      platform: "youtube",
      input: "",
      extra: {
        mode: "search",
        message: "",
        url: "",
        destination: ""
      }
    }
  });

  const selectedPlatform = form.watch("platform");
  const inputValue = form.watch("input");
  const selectedMode = form.watch("extra.mode");

  // Auto-detect logic
  useEffect(() => {
    if (!autoDetect || !inputValue) return;
    
    // Simple heuristics
    const lowerInput = inputValue.toLowerCase();
    let detected = "";

    if (lowerInput.includes("youtube.com") || lowerInput.includes("youtu.be")) {
      detected = "youtube";
    } else if (lowerInput.includes("instagram.com")) {
      detected = "instagram";
    } else if (lowerInput.includes("twitter.com") || lowerInput.includes("x.com")) {
      detected = "twitter";
    } else if (lowerInput.includes("google.com/maps") || lowerInput.includes("maps.app.goo.gl")) {
      detected = "google_maps";
    }

    if (detected && detected !== selectedPlatform) {
      // @ts-ignore - type safety for dynamic string
      form.setValue("platform", detected as any);
      toast({
        title: "Platform Detected",
        description: `Switched to ${PLATFORMS.find(p => p.id === detected)?.name}`,
        duration: 2000,
      });
    }
  }, [inputValue, autoDetect, selectedPlatform, form, toast]);

  const onSubmit = (data: FormValues) => {
    generate.mutate(data, {
      onSuccess: (res) => {
        if (res.ok && res.generatedLink) {
          setResult({ link: res.generatedLink, notes: res.notes });
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          // Scroll to result
          setTimeout(() => {
            document.getElementById("result-section")?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else if (res.error) {
          toast({
            variant: "destructive",
            title: "Generation Failed",
            description: res.error
          });
        }
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message
        });
      }
    });
  };

  const handleCopy = () => {
    if (!result?.link) return;
    navigator.clipboard.writeText(result.link);
    trackEvent("copy_link", { platform: selectedPlatform });
    toast({
      title: "Copied!",
      description: "Link copied to clipboard.",
    });
  };

  const handleOpen = () => {
    if (!result?.link) return;
    trackEvent("open_link_click", { platform: selectedPlatform });
    window.open(result.link, "_blank");
  };

  const handleReset = () => {
    form.reset({
      platform: "youtube",
      input: "",
      extra: { mode: "search", message: "", url: "", destination: "" }
    });
    setResult(null);
  };

  const currentPlatformIcon = PLATFORMS.find(p => p.id === selectedPlatform)?.icon || Link2;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl mb-4"
          >
            <div className="bg-gradient-to-tr from-primary to-accent p-3 rounded-xl">
              <Link2 className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            App Opener <span className="text-gradient">Generator</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Create deep links that open directly in native apps. 
            Paste a URL or enter details to get started.
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary animate-gradient bg-[length:200%_auto]" />
          
          <CardContent className="p-6 sm:p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="auto-detect" 
                  checked={autoDetect}
                  onCheckedChange={setAutoDetect}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="auto-detect" className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Auto-detect platform
                </Label>
              </div>
              {result && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Platform Selector */}
              <div className="space-y-2">
                <Label className="text-base">Platform</Label>
                <Controller
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-14 px-4 text-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="py-3">
                            <div className="flex items-center font-medium">
                              <p.icon className={`w-5 h-5 mr-3 ${p.color}`} />
                              {p.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-6 bg-slate-50 dark:bg-slate-950/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                
                {/* DYNAMIC INPUTS */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedPlatform}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    
                    {/* YOUTUBE */}
                    {selectedPlatform === "youtube" && (
                      <div className="space-y-3">
                        <Label>Video URL or ID</Label>
                        <Input 
                          {...form.register("input")} 
                          placeholder="e.g. https://www.youtube.com/watch?v=..." 
                          className="h-12 input-ring"
                        />
                        <p className="text-xs text-muted-foreground">Supports standard URLs, Shorts, and video IDs.</p>
                      </div>
                    )}

                    {/* INSTAGRAM */}
                    {selectedPlatform === "instagram" && (
                      <div className="space-y-3">
                        <Label>Profile URL, Post URL, or Username</Label>
                        <Input 
                          {...form.register("input")} 
                          placeholder="e.g. instagram.com/username or post URL" 
                          className="h-12 input-ring"
                        />
                      </div>
                    )}

                    {/* WHATSAPP */}
                    {selectedPlatform === "whatsapp" && (
                      <>
                        <div className="space-y-3">
                          <Label>Phone Number</Label>
                          <Input 
                            {...form.register("input")} 
                            placeholder="e.g. +1 234 567 8900" 
                            className="h-12 input-ring"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Pre-filled Message (Optional)</Label>
                          <Textarea 
                            {...form.register("extra.message")} 
                            placeholder="Hello! I'm interested in..." 
                            className="min-h-[100px] resize-none input-ring"
                          />
                        </div>
                      </>
                    )}

                    {/* GOOGLE MAPS */}
                    {selectedPlatform === "google_maps" && (
                      <>
                        <Controller
                          control={form.control}
                          name="extra.mode"
                          defaultValue="search"
                          render={({ field }) => (
                            <RadioGroup 
                              onValueChange={field.onChange} 
                              value={field.value} 
                              className="flex gap-4 pb-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="search" id="mode-search" />
                                <Label htmlFor="mode-search" className="cursor-pointer">Search Location</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="directions" id="mode-dir" />
                                <Label htmlFor="mode-dir" className="cursor-pointer">Get Directions</Label>
                              </div>
                            </RadioGroup>
                          )}
                        />

                        {selectedMode === "search" ? (
                          <div className="space-y-3">
                            <Label>Search Query</Label>
                            <Input 
                              {...form.register("input")} 
                              placeholder="e.g. Eiffel Tower, Paris" 
                              className="h-12 input-ring"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="space-y-3">
                              <Label>Origin (Optional)</Label>
                              <Input 
                                {...form.register("input")} 
                                placeholder="Leave empty for current location" 
                                className="h-12 input-ring"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label>Destination</Label>
                              <Input 
                                {...form.register("extra.destination")} 
                                placeholder="Where are you going?" 
                                className="h-12 input-ring"
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* TWITTER / X */}
                    {selectedPlatform === "twitter" && (
                      <>
                        <Controller
                          control={form.control}
                          name="extra.mode"
                          defaultValue="tweet"
                          render={({ field }) => (
                            <RadioGroup 
                              onValueChange={field.onChange} 
                              value={field.value} 
                              className="flex gap-4 pb-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="tweet" id="mode-tweet" />
                                <Label htmlFor="mode-tweet" className="cursor-pointer">Post Tweet</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="follow" id="mode-follow" />
                                <Label htmlFor="mode-follow" className="cursor-pointer">Follow User</Label>
                              </div>
                            </RadioGroup>
                          )}
                        />

                        {selectedMode === "tweet" ? (
                          <>
                            <div className="space-y-3">
                              <Label>Tweet Text</Label>
                              <Textarea 
                                {...form.register("input")} 
                                placeholder="What's happening?" 
                                className="min-h-[100px] resize-none input-ring"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label>URL Attachment (Optional)</Label>
                              <Input 
                                {...form.register("extra.url")} 
                                placeholder="https://..." 
                                className="h-12 input-ring"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <Label>Username to Follow</Label>
                            <div className="relative">
                              <span className="absolute left-4 top-3 text-muted-foreground">@</span>
                              <Input 
                                {...form.register("input")} 
                                placeholder="username" 
                                className="h-12 pl-9 input-ring"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                  </motion.div>
                </AnimatePresence>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
                disabled={generate.isPending}
              >
                {generate.isPending ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate App Link
                  </>
                )}
              </Button>
            </form>

            {/* RESULT SECTION */}
            <AnimatePresence>
              {result && (
                <motion.div
                  id="result-section"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                >
                  <Alert className="bg-primary/5 border-primary/20 text-primary">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Success!</AlertTitle>
                    <AlertDescription>
                      Your deep link is ready. Use the buttons below to test it.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Generated Link</Label>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={result.link} 
                        className="h-12 font-mono text-sm bg-slate-50 dark:bg-slate-950" 
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-12 w-12 shrink-0" 
                        onClick={handleCopy}
                        title="Copy to clipboard"
                      >
                        <Copy className="w-5 h-5" />
                      </Button>
                      <Button 
                        size="icon" 
                        className="h-12 w-12 shrink-0 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20" 
                        onClick={handleOpen}
                        title="Open Link"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {result.notes && (
                    <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <strong>Note:</strong> {result.notes}
                    </div>
                  )}

                  <div className="pt-4 flex justify-center">
                     <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold opacity-50">
                       Analytics: GTM events active
                     </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
