"use client";

import { useState, useEffect } from "react";
import { UploadCloud, FileText, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function PdfImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imports, setImports] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    // APIを作成していませんが、クライアント側で直接Prismaは叩けないため、
    // GET api/pdf-imports を追加するか、一覧はここでダミー表示にするか
    // 今回は簡易的にダミーか、空配列にします。
    try {
      const res = await fetch('/api/pdf-imports/list');
      if (res.ok) {
        const data = await res.json();
        setImports(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/pdf-imports", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
      fetchImports();
    } catch (error) {
      setResult({ success: false, error: "アップロードに失敗しました。" });
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  // ヘルパー関数: 解析データから各項目を安全に抽出・計算
  const getParsedInfo = (parsedData: any) => {
    if (!parsedData) return null;
    
    // お見積No
    const estimateNo = parsedData.estimateNo || 
      parsedData.items?.find((i: any) => i.estimateNo)?.estimateNo || 
      "-";

    // 購買No (documentNumber)
    const documentNumber = parsedData.documentNumber || "-";

    // 商品名
    const items = parsedData.items || [];
    const itemNames = items.length > 0 
      ? items.map((i: any) => i.itemName).filter(Boolean).join(" / ") 
      : (parsedData.itemName || "-");

    // 税抜き金額合計（PDF上に記載された「税抜金額合計」）
    let subtotal = parsedData.subtotalAmount;
    if (subtotal === undefined || subtotal === null) {
      if (items.length > 0) {
        const sum = items.reduce((acc: number, it: any) => acc + (Number(it.amount) || 0), 0);
        if (sum > 0) subtotal = sum;
      }
    }

    return {
      estimateNo,
      documentNumber,
      itemNames,
      subtotal: subtotal !== undefined && subtotal !== null ? Number(subtotal) : null,
      totalAmount: parsedData.totalAmount ? Number(parsedData.totalAmount) : null,
      partnerName: parsedData.partnerName || parsedData.issuerName || "-",
      type: parsedData.type,
      items,
    };
  };

  const currentParsedInfo = result?.parsedData ? getParsedInfo(result.parsedData) : null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">PDFデータ自動取込</h1>
        <p className="text-gray-600">
          注文書、支払明細、請求書などのPDFをアップロードすると、AIが内容を読み取って自動登録します。
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
        <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-700 font-medium mb-2">
          PDFファイルをドラッグ＆ドロップ、または選択してください
        </p>
        <input
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          id="file-upload"
          onChange={handleFileChange}
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 font-medium shadow-sm transition"
        >
          ファイルを選択
        </label>
        {file && (
          <div className="mt-4 text-sm font-semibold text-blue-800 bg-blue-50 inline-block px-4 py-1.5 rounded-full border border-blue-200">
            選択中: {file.name}
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition"
        >
          {isUploading ? "AI解析中..." : "アップロードして自動解析を実行"}
        </button>
      </div>

      {result && (
        <div className={`p-6 rounded-xl border shadow-sm ${result.success ? 'bg-white border-green-300 ring-1 ring-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-4">
            {result.success ? (
              <div className="p-2 bg-green-100 rounded-full text-green-700">
                <CheckCircle className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2 bg-red-100 rounded-full text-red-700">
                <AlertCircle className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${result.success ? 'text-green-900' : 'text-red-800'}`}>
                  {result.success ? "AI解析完了" : "エラー発生"}
                </h3>
                {result.data?.id && (
                  <Link href={`/pdf-imports/${result.data.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                    取込詳細を確認する &rarr;
                  </Link>
                )}
              </div>

              {result.success && currentParsedInfo ? (
                <div className="mt-4 space-y-4">
                  {/* 主要抽出項目カード（お見積No、購買No、商品名、税抜き金額合計） */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* お見積No */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">お見積No</div>
                      <div className="text-lg font-bold text-blue-900 truncate">
                        {currentParsedInfo.estimateNo}
                      </div>
                    </div>

                    {/* 購買No */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">購買No (発注No)</div>
                      <div className="text-lg font-bold text-indigo-900 truncate">
                        {currentParsedInfo.documentNumber}
                      </div>
                    </div>

                    {/* 税抜き金額合計 */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">税抜き金額合計</div>
                      <div className="text-lg font-bold text-emerald-900">
                        {currentParsedInfo.subtotal !== null 
                          ? `¥${currentParsedInfo.subtotal.toLocaleString()}` 
                          : "-"}
                      </div>
                      {currentParsedInfo.totalAmount !== null && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          (税込 ¥{currentParsedInfo.totalAmount.toLocaleString()})
                        </div>
                      )}
                    </div>

                    {/* 書類種別 / 取引先 */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">取引先 / 書類種別</div>
                      <div className="text-sm font-bold text-gray-800 truncate" title={currentParsedInfo.partnerName}>
                        {currentParsedInfo.partnerName}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        種別: {currentParsedInfo.type || "不明"}
                      </div>
                    </div>
                  </div>

                  {/* 商品名 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">商品名（明細品名）</div>
                    {currentParsedInfo.items.length > 0 ? (
                      <div className="space-y-1.5">
                        {currentParsedInfo.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-100">
                            <span className="font-medium text-gray-800">
                              {idx + 1}. {item.itemName || "名称未設定"}
                            </span>
                            <span className="text-gray-600 text-xs">
                              {item.quantity ? `${item.quantity}${item.unit || ""}` : ""} 
                              {item.amount ? ` (¥${Number(item.amount).toLocaleString()})` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 font-medium">
                        {currentParsedInfo.itemNames}
                      </div>
                    )}
                  </div>

                  {/* 自動連携情報 */}
                  {result.createdOrder && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 flex items-center justify-between">
                      <span>
                        発注データ <strong>{result.createdOrder.orderNumber}</strong> を自動生成しました
                      </span>
                      <Link href={`/orders/${result.createdOrder.id}`} className="font-bold underline ml-2">
                        発注書を開く
                      </Link>
                    </div>
                  )}
                  {result.matchedEstimate && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-900 flex items-center justify-between">
                      <span>
                        お見積 <strong>{result.matchedEstimate.estimateNumber}</strong> と受注承諾を自動紐付けしました
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-600 mt-2">{result.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">過去の取込履歴</h2>
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 font-medium text-gray-600">取込日時</th>
                <th className="p-3 font-medium text-gray-600">お見積No</th>
                <th className="p-3 font-medium text-gray-600">購買No</th>
                <th className="p-3 font-medium text-gray-600">商品名</th>
                <th className="p-3 font-medium text-gray-600 text-right">税抜合計金額</th>
                <th className="p-3 font-medium text-gray-600 text-center">詳細</th>
              </tr>
            </thead>
            <tbody>
              {imports.length > 0 ? (
                imports.map((item) => {
                  const info = getParsedInfo(item.parsedData);
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-medium text-blue-700 whitespace-nowrap">
                        {info?.estimateNo || "-"}
                      </td>
                      <td className="p-3 font-medium text-gray-800 whitespace-nowrap">
                        {info?.documentNumber || "-"}
                      </td>
                      <td className="p-3 text-gray-700 max-w-xs truncate" title={info?.itemNames}>
                        {info?.itemNames || item.fileName}
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-800 whitespace-nowrap">
                        {info?.subtotal !== null && info?.subtotal !== undefined
                          ? `¥${info.subtotal.toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <Link href={`/pdf-imports/${item.id}`} className="text-blue-600 hover:underline font-medium">
                          表示
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    履歴はありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
