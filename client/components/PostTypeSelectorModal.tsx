import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Loader2 } from 'lucide-react';

interface PostType {
  name: string;
  label: string;
  singular: string;
  description?: string;
  count: number;
  hierarchical: boolean;
  has_archive: boolean;
}

interface PostTypeSelectorModalProps {
  open: boolean;
  onClose: () => void;
  postTypes: PostType[];
  loading: boolean;
  onConfirm: (postType: string) => void;
  websiteName: string;
}

export default function PostTypeSelectorModal({
  open,
  onClose,
  postTypes,
  loading,
  onConfirm,
  websiteName,
}: PostTypeSelectorModalProps) {
  const [selectedPostType, setSelectedPostType] = useState<string>('post');

  const handleConfirm = () => {
    onConfirm(selectedPostType);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Chọn loại nội dung để đồng bộ</DialogTitle>
          <DialogDescription>
            Chọn loại nội dung bạn muốn đồng bộ từ website <strong>{websiteName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Đang tải danh sách loại nội dung...</span>
          </div>
        ) : postTypes.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            Không tìm thấy loại nội dung nào
          </div>
        ) : (
          <div className="py-4">
            <RadioGroup value={selectedPostType} onValueChange={setSelectedPostType}>
              <div className="space-y-3">
                {postTypes.map((postType) => (
                  <div
                    key={postType.name}
                    className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-gray-50"
                  >
                    <RadioGroupItem
                      value={postType.name}
                      id={postType.name}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={postType.name}
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{postType.label}</span>
                        <span className="text-sm text-gray-500">
                          ({postType.count} {postType.count === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                      {postType.description && (
                        <p className="text-sm text-gray-600">{postType.description}</p>
                      )}
                      <div className="flex gap-2 text-xs text-gray-400">
                        <span>Type: {postType.name}</span>
                        {postType.hierarchical && <span>• Phân cấp</span>}
                        {postType.has_archive && <span>• Có archive</span>}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={loading || postTypes.length === 0}>
            Đồng bộ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
