import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: number;
  planTokens: number;
  planArticles: number;
  onPaymentConfirmed: () => void;
  username?: string;
  billingPeriod?: "monthly" | "annual";
}

// Format price with proper Vietnamese number format (1500000 -> 1.500.000)
const formatPrice = (price: number): string => {
  if (price === 0) return "0";
  // Convert to integer to remove any decimals, then format with thousand separators
  const intPrice = Math.round(price);
  return intPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Generate VietQR using API
// Uses VietQR.io v2/generate API to create QR code
const generateVietQRImage = async (amount: number, transferContent: string): Promise<string> => {
  try {
    const response = await fetch("https://api.vietqr.io/v2/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountNo: "84931912379",
        accountName: "NGUYEN ANH TUNG",
        acqId: 970010, // TP Bank BIN
        amount: Math.round(amount),
        addInfo: (transferContent || "tung").substring(0, 25),
        format: "text",
        template: "compact2",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate QR code");
    }

    const data = await response.json();
    
    // Return the QR code image as data URL
    if (data.data && data.data.qrDataURL) {
      return data.data.qrDataURL;
    }
    
    throw new Error("Invalid response from VietQR API");
  } catch (error) {
    console.error("Error generating QR code:", error);
    // Fallback to alternative format
    return `https://img.vietqr.io/image/TPB-84931912379-compact.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent((transferContent || "tung").substring(0, 25))}`;
  }
};

export function PaymentModal({
  isOpen,
  onClose,
  planName,
  planPrice,
  planTokens,
  planArticles,
  onPaymentConfirmed,
  username = "",
  billingPeriod = "monthly",
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"bank" | null>("bank");
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<
    "payment" | "confirm"
  >("payment");
  const [qrCodeImage, setQrCodeImage] = useState<string>("");
  const [isLoadingQR, setIsLoadingQR] = useState(false);

  const bankTransferInfo = {
    bankName: "TP Bank",
    accountNumber: "84931912379",
    accountName: "NGUYEN ANH TUNG",
    transferContent: username,
  };

  // Generate QR code when modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      setIsLoadingQR(true);
      generateVietQRImage(planPrice, username || "tung")
        .then((imageUrl) => {
          setQrCodeImage(imageUrl);
          setIsLoadingQR(false);
        })
        .catch((error) => {
          console.error("Failed to load QR code:", error);
          setIsLoadingQR(false);
        });
    }
  }, [isOpen, planPrice, username]);

  const handleConfirmPayment = async () => {
    setIsConfirming(true);
    try {
      // Call the callback to record payment and set it to pending approval
      await onPaymentConfirmed();

      // Close modal and reset
      setTimeout(() => {
        onClose();
        setConfirmationStep("payment");
        setIsConfirming(false);
      }, 1500);
    } catch (error) {
      console.error("Payment confirmation error:", error);
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Nâng cấp lên {planName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Thanh toán qua chuyển khoản ngân hàng
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Payment Method */}
          {confirmationStep === "payment" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Phương thức thanh toán
              </h3>

              <div
                className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                  paymentMethod === "bank"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setPaymentMethod("bank")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      paymentMethod === "bank"
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}
                  >
                    {paymentMethod === "bank" && (
                      <Check className="w-2 h-2 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Chuyển khoản ngân hàng
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Miễn phí, nhanh chóng
                    </p>
                  </div>
                </div>
              </div>

              {paymentMethod === "bank" && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column: Bill Summary */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground uppercase">
                      Thông tin đơn hàng
                    </h4>
                    <div className="bg-primary/5 rounded-lg p-2 space-y-0.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Gói:</span>
                        <span className="font-semibold text-foreground">
                          {planName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Kỳ hạn:</span>
                        <span className="font-semibold text-foreground">
                          {billingPeriod === "annual" ? "Hàng năm" : "Hàng tháng"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Token:</span>
                        <span className="font-semibold text-foreground">
                          {planTokens.toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Bài viết:</span>
                        <span className="font-semibold text-foreground">
                          {planArticles.toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-primary/20 flex justify-between items-center">
                        <span className="font-semibold text-foreground">
                          Giá:
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {formatPrice(planPrice)} ₫
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: QR Code & Bank Info */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground uppercase">
                      Thông tin chuyển khoản
                    </h4>

                    {/* QR Code */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">
                        Quét mã QR:
                      </p>
                      <div className="flex justify-center bg-white p-2 rounded-lg border border-border">
                        {isLoadingQR ? (
                          <div className="w-[120px] h-[120px] flex items-center justify-center text-muted-foreground">
                            Loading...
                          </div>
                        ) : qrCodeImage ? (
                          <img
                            src={qrCodeImage}
                            alt="VietQR Code"
                            width={120}
                            height={120}
                            className="rounded"
                          />
                        ) : (
                          <div className="w-[120px] h-[120px] flex items-center justify-center text-muted-foreground text-xs">
                            Failed to load QR
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bank Transfer Info */}
                    <div className="space-y-0 text-xs">
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">
                          Ngân hàng:
                        </span>
                        <span className="font-medium text-foreground">
                          {bankTransferInfo.bankName}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">Số TK:</span>
                        <span className="font-medium text-foreground">
                          {bankTransferInfo.accountNumber}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">Chủ TK:</span>
                        <span className="font-medium text-foreground">
                          {bankTransferInfo.accountName}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5 border-t border-border">
                        <span className="text-muted-foreground">Nội dung:</span>
                        <span className="font-medium text-foreground text-right break-words max-w-xs">
                          {bankTransferInfo.transferContent}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">Số tiền:</span>
                        <span className="font-bold text-primary">
                          {planPrice.toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setConfirmationStep("confirm")}
                className="w-full bg-primary hover:bg-primary/90 h-10 font-semibold text-sm mt-3"
              >
                Tiếp tục
              </Button>
            </div>
          )}

          {/* Confirmation Step */}
          {confirmationStep === "confirm" && !isConfirming && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900">
                  Sau khi hoàn thành chuyển khoản, nhấn "Tôi đã thanh toán" để
                  xác nhận.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setConfirmationStep("payment")}
                  variant="outline"
                  className="flex-1 h-10 text-sm"
                >
                  Quay lại
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  className="flex-1 bg-primary hover:bg-primary/90 h-10 font-semibold text-sm"
                  disabled={isConfirming}
                >
                  {isConfirming ? "Đang xác nhận..." : "Tôi đã thanh toán"}
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation Complete */}
          {confirmationStep === "confirm" && isConfirming && (
            <div className="space-y-2 py-4 text-center">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Xác nhận thành công!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Gói dịch vụ {planName} đã được kích hoạt
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
