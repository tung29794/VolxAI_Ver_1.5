import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TokenUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingTokens: number;
  requiredTokens?: number;
  featureName?: string;
}

export function TokenUpgradeModal({
  isOpen,
  onClose,
  remainingTokens,
  requiredTokens,
  featureName = "chức năng AI",
}: TokenUpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate("/upgrade");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            Không đủ Token
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {requiredTokens ? (
              <>
                Bạn cần <span className="font-bold text-foreground">{requiredTokens.toLocaleString()}</span> tokens để sử dụng{" "}
                <span className="font-semibold text-foreground">{featureName}</span>
              </>
            ) : (
              <>
                Bạn đã hết token để sử dụng{" "}
                <span className="font-semibold text-foreground">{featureName}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Token Status */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Token hiện tại:</span>
              <span className={`text-lg font-bold ${remainingTokens === 0 ? 'text-red-600' : 'text-foreground'}`}>
                {remainingTokens.toLocaleString()}
              </span>
            </div>
            {requiredTokens && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Token cần thiết:</span>
                <span className="text-lg font-bold text-foreground">
                  {requiredTokens.toLocaleString()}
                </span>
              </div>
            )}
            {requiredTokens && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Thiếu:</span>
                <span className="text-lg font-bold text-red-600">
                  {(requiredTokens - remainingTokens).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Nâng cấp để nhận:
            </p>
            <ul className="space-y-2">
              {[
                "Hàng triệu tokens mỗi tháng",
                "Tất cả tính năng AI cao cấp",
                "Không giới hạn số bài viết",
                "Hỗ trợ ưu tiên",
              ].map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Crown className="w-4 h-4 text-primary flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={handleUpgrade}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <Crown className="w-5 h-5 mr-2" />
            Nâng cấp ngay
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Để sau
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
