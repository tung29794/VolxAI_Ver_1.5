import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { toast } from "sonner";

interface Website {
  id: number;
  name: string;
  url: string;
  platform: string;
}

interface PostType {
  name: string;  // Changed from 'slug' to match server response
  label: string;
  singular?: string;
  description?: string;
  count?: number;
  hierarchical?: boolean;
  has_archive?: boolean;
  // Also support legacy 'slug' field for backward compatibility
  slug?: string;
}

interface Taxonomy {
  name: string;
  label: string;
  terms: Array<{
    id: number;
    name: string;
  }>;
}

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId?: number;
  articleData: {
    title: string;
    content: string;
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
    keywords?: string[];
    featuredImage?: string;
  };
  onPublishSuccess: () => void;
  mode: "create" | "update";
}

export default function PublishModal({
  isOpen,
  onClose,
  articleId,
  articleData,
  onPublishSuccess,
  mode,
}: PublishModalProps) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [selectedPostType, setSelectedPostType] = useState<string>("post");
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<Record<string, number>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [loadingPostTypes, setLoadingPostTypes] = useState(false);
  const [loadingTaxonomies, setLoadingTaxonomies] = useState(false);

  // Fetch connected websites
  useEffect(() => {
    if (isOpen) {
      fetchWebsites();
    }
  }, [isOpen]);

  // Fetch post types when website changes
  useEffect(() => {
    console.log("🔄 Website changed:", selectedWebsite);
    if (selectedWebsite && selectedWebsite !== "volxai") {
      console.log("📡 Fetching post types for website:", selectedWebsite);
      fetchPostTypes(parseInt(selectedWebsite));
    } else {
      console.log("⏭️ Skipping post types (no website or VolxAI selected)");
      setPostTypes([]);
      setTaxonomies([]);
    }
  }, [selectedWebsite]);

  // Fetch taxonomies when post type changes
  useEffect(() => {
    if (
      selectedWebsite &&
      selectedWebsite !== "volxai" &&
      selectedPostType &&
      selectedPostType !== "page"
    ) {
      fetchTaxonomies(parseInt(selectedWebsite), selectedPostType);
    } else {
      setTaxonomies([]);
      setSelectedTaxonomy({});
    }
  }, [selectedWebsite, selectedPostType]);

  const fetchWebsites = async () => {
    try {
      const token = localStorage.getItem("authToken");
      console.log("🔍 Fetching websites...");
      const response = await fetch(buildApiUrl("/api/websites"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📡 Response status:", response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log("📦 Full response:", result);
        
        // Backend returns { success: true, data: [...] }
        if (result.success && result.data && Array.isArray(result.data)) {
          setWebsites(result.data);
          console.log("✅ Set websites:", result.data.length, "items");
        } else if (Array.isArray(result)) {
          // Fallback: if backend returns array directly
          setWebsites(result);
          console.log("✅ Set websites (direct array):", result.length, "items");
        } else {
          console.warn("⚠️ Unexpected data format:", result);
          setWebsites([]);
        }
      } else {
        console.error("❌ Response not OK:", response.status);
        setWebsites([]);
      }
    } catch (error) {
      console.error("❌ Error fetching websites:", error);
      setWebsites([]);
    }
  };

  const fetchPostTypes = async (websiteId: number) => {
    setLoadingPostTypes(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        buildApiUrl(`/api/websites/${websiteId}/post-types`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("📦 Post types response:", result);
        console.log("📦 Post types data:", result.data);
        console.log("📦 First item:", result.data?.[0]);
        
        // Backend returns { success: true, data: [...] }
        if (result.success && result.data && Array.isArray(result.data)) {
          console.log("✅ Setting post types, count:", result.data.length);
          console.log("✅ Post types array:", JSON.stringify(result.data, null, 2));
          setPostTypes(result.data);
          console.log("✅ Set post types:", result.data.length, "items");
          // Reset to default post type
          setSelectedPostType("post");
        } else if (Array.isArray(result)) {
          // Fallback: if backend returns array directly
          setPostTypes(result);
          setSelectedPostType("post");
        } else {
          console.warn("⚠️ Unexpected post types format:", result);
          setPostTypes([]);
        }
      } else {
        console.error("❌ Post types response not OK:", response.status);
        setPostTypes([]);
      }
    } catch (error) {
      console.error("Error fetching post types:", error);
      toast.error("Không thể tải danh sách post type");
      setPostTypes([]);
    } finally {
      setLoadingPostTypes(false);
    }
  };

  const fetchTaxonomies = async (websiteId: number, postType: string) => {
    setLoadingTaxonomies(true);
    try {
      const token = localStorage.getItem("authToken");
      console.log("🔍 Fetching taxonomies for post type:", postType);
      const response = await fetch(
        buildApiUrl(`/api/websites/${websiteId}/taxonomies?post_type=${encodeURIComponent(postType)}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📡 Taxonomies response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("📦 Taxonomies response:", result);
        console.log("📦 Taxonomies data:", result.data);
        
        if (result.success && result.data && Array.isArray(result.data)) {
          console.log("✅ Setting taxonomies, count:", result.data.length);
          setTaxonomies(result.data);
        } else {
          console.log("⚠️ No taxonomies data or invalid format");
          setTaxonomies([]);
        }
        setSelectedTaxonomy({});
      } else {
        console.error("❌ Taxonomies response not OK:", response.status);
        setTaxonomies([]);
      }
    } catch (error) {
      console.error("❌ Error fetching taxonomies:", error);
      toast.error("Không thể tải danh sách chuyên mục");
      setTaxonomies([]);
    } finally {
      setLoadingTaxonomies(false);
    }
  };

  const handlePublishNow = async () => {
    console.log("🎯 handlePublishNow called!");
    console.log("Selected website:", selectedWebsite);
    console.log("Article ID:", articleId);
    
    if (!selectedWebsite) {
      toast.error("Vui lòng chọn website để đăng bài");
      return;
    }

    setIsPublishing(true);

    try {
      const token = localStorage.getItem("authToken");

      // STEP 1: Always save to VolxAI.com first (as backup)
      console.log("📝 STEP 1: Saving to VolxAI.com first...");
      console.log("Payload:", {
        id: articleId,
        title: articleData.title,
        status: "published",
      });
      
      const saveResponse = await fetch(buildApiUrl("/api/articles/save"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: articleId,
          title: articleData.title,
          content: articleData.content,
          metaTitle: articleData.metaTitle || articleData.title,
          metaDescription: articleData.metaDescription || "",
          slug: articleData.slug || "",
          keywords: articleData.keywords || [],
          featuredImage: articleData.featuredImage || "",
          status: "published",
        }),
      });

      console.log("Save response status:", saveResponse.status);
      
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error("❌ Save failed:", errorText);
        throw new Error("Không thể lưu bài viết vào VolxAI");
      }

      const saveResult = await saveResponse.json();
      console.log("✅ STEP 1 SUCCESS - Saved to VolxAI.com!");
      console.log("Save result:", saveResult);
      
      // Get the saved article ID for publishing to WordPress
      const savedArticleId = saveResult.data?.id || articleId;
      console.log("Saved article ID:", savedArticleId);

      // If "Tạm lưu ở VolxAI.com" - stop here
      if (selectedWebsite === "volxai") {
        console.log("✅ VolxAI selected, stopping here");
        toast.success(
          mode === "create"
            ? "Bài viết đã được lưu vào VolxAI!"
            : "Bài viết đã được cập nhật!"
        );
        onPublishSuccess();
        onClose();
        return;
      }

      // STEP 2: Publish to WordPress
      console.log("🚀 STEP 2: Publishing to WordPress...");
      const websiteId = parseInt(selectedWebsite);
      console.log("Website ID:", websiteId);
      console.log("Post Type:", selectedPostType);
      console.log("Taxonomies:", selectedTaxonomy);
      
      // IMPORTANT: Send the LATEST article data, not just ID
      // Because the article was just saved in STEP 1, we need to pass the new content
      const publishResponse = await fetch(
        buildApiUrl(`/api/websites/${websiteId}/publish`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            articleId: savedArticleId,
            postType: selectedPostType,
            taxonomies: selectedTaxonomy,
            // Pass the latest article data from editor (not from DB)
            articleData: {
              title: articleData.title,
              content: articleData.content,
              metaTitle: articleData.metaTitle || articleData.title,
              metaDescription: articleData.metaDescription || "",
              slug: articleData.slug || "",
              keywords: articleData.keywords || [],
              featuredImage: articleData.featuredImage || "",
            },
          }),
        }
      );

      console.log("Publish response status:", publishResponse.status);

      if (!publishResponse.ok) {
        const errorData = await publishResponse.json();
        console.error("❌ Publish failed:", errorData);
        throw new Error(errorData.error || "Không thể đăng bài lên website");
      }

      const publishResult = await publishResponse.json();
      console.log("✅ STEP 2 SUCCESS - Published to WordPress!");
      console.log("Publish result:", publishResult);
      
      toast.success(
        mode === "create"
          ? "✅ Bài viết đã được lưu vào VolxAI và đăng lên website thành công!"
          : "✅ Bài viết đã được cập nhật trên VolxAI và website!"
      );
      onPublishSuccess();
      onClose();
    } catch (error) {
      console.error("❌ ERROR in handlePublishNow:", error);
      toast.error(
        error instanceof Error ? error.message : "Có lỗi xảy ra khi đăng bài"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedulePublish = async () => {
    if (!selectedWebsite) {
      toast.error("Vui lòng chọn website để đăng bài");
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      toast.error("Vui lòng chọn ngày và giờ đăng bài");
      return;
    }

    // If VolxAI selected, just save as published (no schedule)
    if (selectedWebsite === "volxai") {
      return handlePublishNow();
    }

    setIsPublishing(true);

    try {
      const token = localStorage.getItem("authToken");

      // STEP 1: Always save to VolxAI.com first (as backup)
      console.log("📝 Step 1: Saving to VolxAI.com first (scheduled publish)...");
      const saveResponse = await fetch(buildApiUrl("/api/articles/save"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: articleId,
          title: articleData.title,
          content: articleData.content,
          metaTitle: articleData.metaTitle || articleData.title,
          metaDescription: articleData.metaDescription || "",
          slug: articleData.slug || "",
          keywords: articleData.keywords || [],
          featuredImage: articleData.featuredImage || "",
          status: "published",
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Không thể lưu bài viết vào VolxAI");
      }

      const saveResult = await saveResponse.json();
      console.log("✅ Saved to VolxAI.com successfully");
      
      // Get the saved article ID for scheduling
      const savedArticleId = saveResult.data?.id || articleId;

      // STEP 2: Schedule publish to WordPress
      console.log("⏰ Step 2: Scheduling publish to WordPress...");
      const websiteId = parseInt(selectedWebsite);

      // Combine date and time
      const [hours, minutes] = scheduleTime.split(":");
      const scheduledDateTime = new Date(scheduleDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

      const scheduleResponse = await fetch(
        buildApiUrl(`/api/websites/${websiteId}/schedule-publish`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            articleId: savedArticleId,
            postType: selectedPostType,
            taxonomies: selectedTaxonomy,
            scheduledTime: scheduledDateTime.toISOString(),
          }),
        }
      );

      if (!scheduleResponse.ok) {
        const errorData = await scheduleResponse.json();
        throw new Error(errorData.error || "Không thể hẹn giờ đăng bài");
      }

      console.log("✅ Scheduled to WordPress successfully");
      toast.success("✅ Bài viết đã được lưu vào VolxAI và hẹn giờ đăng thành công!");
      onPublishSuccess();
      onClose();
    } catch (error) {
      console.error("Error scheduling:", error);
      toast.error(
        error instanceof Error ? error.message : "Có lỗi xảy ra khi hẹn giờ đăng bài"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {mode === "create" ? "Đăng bài viết" : "Cập nhật bài viết"}
          </h2>

          <div className="space-y-4">
            {/* Website Selection */}
            <div>
              <Label>Website đăng lên *</Label>
              <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn website" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volxai">Tạm lưu ở VolxAI.com</SelectItem>
                  {Array.isArray(websites) && websites.map((website) => (
                    <SelectItem key={website.id} value={website.id.toString()}>
                      {website.name} ({website.url})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Post Type Selection (WordPress only) */}
            {selectedWebsite && selectedWebsite !== "volxai" && (
              <div>
                <Label>Post Type *</Label>
                {loadingPostTypes ? (
                  <div className="flex items-center gap-2 p-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-500">Đang tải...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedPostType}
                    onValueChange={(value) => {
                      console.log("🔄 Post type changed to:", value);
                      setSelectedPostType(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn post type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(postTypes) && postTypes
                        .filter((type) => type && (type.name || type.slug || typeof type === 'string'))
                        .map((type, index) => {
                          // Handle multiple formats: {name, label}, {slug, label}, or string
                          let slug, label, count;
                          
                          if (typeof type === 'object') {
                            // Prefer 'name' over 'slug' (our server sends 'name')
                            slug = type.name || type.slug;
                            label = type.label || slug;
                            count = type.count || 0;
                          } else if (typeof type === 'string') {
                            slug = type;
                            label = type;
                            count = 0;
                          } else {
                            return null;
                          }
                          
                          console.log(`Rendering option: name="${slug}", label="${label}", count=${count}`);
                          return (
                            <SelectItem key={`${slug}-${index}`} value={slug}>
                              {label} {count > 0 ? `(${count} items)` : ''}
                            </SelectItem>
                          );
                        })
                        .filter(Boolean)
                      }
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Taxonomy Selection */}
            {selectedWebsite &&
              selectedWebsite !== "volxai" &&
              selectedPostType !== "page" &&
              taxonomies.length > 0 && (
                <div>
                  {loadingTaxonomies ? (
                    <div className="flex items-center gap-2 p-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-500">Đang tải...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Array.isArray(taxonomies) && taxonomies.map((taxonomy) => (
                        <div key={taxonomy.name}>
                          <Label className="text-sm">{taxonomy.label}</Label>
                          <Select
                            value={selectedTaxonomy[taxonomy.name]?.toString() || ""}
                            onValueChange={(value) =>
                              setSelectedTaxonomy((prev) => ({
                                ...prev,
                                [taxonomy.name]: parseInt(value),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Chọn ${taxonomy.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.isArray(taxonomy.terms) && taxonomy.terms.map((term) => (
                                <SelectItem key={term.id} value={term.id.toString()}>
                                  {term.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {/* Publish Now Button */}
            <Button
              onClick={handlePublishNow}
              disabled={isPublishing || !selectedWebsite}
              className="w-full"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang đăng...
                </>
              ) : mode === "create" ? (
                "Đăng ngay"
              ) : (
                "Cập nhật ngay"
              )}
            </Button>

            {/* Schedule Section */}
            {selectedWebsite && selectedWebsite !== "volxai" && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Hẹn giờ đăng bài
                  </h3>

                  <div className="space-y-3">
                    {/* Date and Time Picker - Same Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Ngày đăng</Label>
                        <Input
                          type="date"
                          value={scheduleDate ? scheduleDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setScheduleDate(new Date(e.target.value));
                            } else {
                              setScheduleDate(undefined);
                            }
                          }}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div>
                        <Label>Giờ đăng</Label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Schedule Button */}
                    <Button
                      onClick={handleSchedulePublish}
                      disabled={
                        isPublishing ||
                        !selectedWebsite ||
                        !scheduleDate ||
                        !scheduleTime
                      }
                      variant="outline"
                      className="w-full"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang thiết lập...
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          Hẹn giờ
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Cancel Button */}
            <Button onClick={onClose} variant="ghost" className="w-full">
              Hủy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
