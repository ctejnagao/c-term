import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileWarning, ExternalLink } from "lucide-react";
import { resolvePdfFilePath } from "@/lib/pdfStorage";
import { calculateExpectedPayDate, adjustToPreviousBusinessDay, formatToYmd } from "@/lib/dateUtils";

export default async function PdfImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  
  if (isNaN(id)) return notFound();

  const data = await prisma.pdfImport.findUnique({
    where: { id },
  });

  if (!data) return notFound();

  // 共有ストレージまたはローカルで実ファイルが存在するか確認
  const resolvedPath = resolvePdfFilePath(data.fileName, data.fileUrl);
  const fileExists = Boolean(resolvedPath);
  const previewUrl = `/api/pdf-imports/${data.id}/file`;

  const parsedData = data.parsedData as any;

  // データの正規化と算出
  const estimateNo = parsedData?.estimateNo || 
    parsedData?.items?.find((i: any) => i.estimateNo)?.estimateNo || 
    "-";

  const documentNumber = parsedData?.documentNumber || "-";

  const items = parsedData?.items || [];

  let subtotal = parsedData?.subtotalAmount;
  if (subtotal === undefined || subtotal === null) {
    if (items.length > 0) {
      const sum = items.reduce((acc: number, it: any) => acc + (Number(it.amount) || 0), 0);
      if (sum > 0) subtotal = sum;
    }
  }

  // 入金予定日の算出（支払明細書の場合、計上日の翌月末。土日の場合は手前の平日に調整）
  let expectedPayDate: string | null = null;
  if (parsedData?.type === 'PAYMENT_STATEMENT' || (documentNumber && String(documentNumber).startsWith('SH'))) {
    if (parsedData?.paymentDate) {
      expectedPayDate = formatToYmd(adjustToPreviousBusinessDay(new Date(parsedData.paymentDate)));
    } else if (parsedData?.date) {
      expectedPayDate = formatToYmd(calculateExpectedPayDate(parsedData.date));
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/pdf-imports" className="flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" />
          一覧に戻る
        </Link>
        <span className="text-sm text-gray-500">
          取込日時: {new Date(data.createdAt).toLocaleString()}
        </span>
      </div>

      <h1 className="text-2xl font-bold mb-6">取込詳細: {data.fileName}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">AI抽出データ</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {parsedData ? (
              <div className="space-y-4">
                {/* 4大ハイライト項目 */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                  <div>
                    <span className="text-xs font-bold text-blue-700 block">お見積No</span>
                    <span className="text-base font-bold text-blue-900">{estimateNo}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-700 block">
                      {parsedData.type === 'PAYMENT_STATEMENT' ? '支払No' : '購買No (発注No)'}
                    </span>
                    <span className="text-base font-bold text-indigo-900">{documentNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-700 block">税抜き金額合計</span>
                    <span className="text-base font-bold text-emerald-900">
                      {subtotal !== null && subtotal !== undefined ? `¥${Number(subtotal).toLocaleString()}` : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-600 block">税込合計金額</span>
                    <span className="text-base font-semibold text-gray-800">
                      {parsedData.totalAmount ? `¥${Number(parsedData.totalAmount).toLocaleString()}` : "-"}
                    </span>
                  </div>
                </div>

                <div className="flex border-b pb-2 pt-2 text-sm">
                  <span className="w-32 font-bold text-gray-600">書類種別</span>
                  <span className="font-medium text-gray-800">{parsedData.type || "-"}</span>
                </div>
                <div className="flex border-b pb-2 text-sm">
                  <span className="w-32 font-bold text-gray-600">取引先</span>
                  <span className="font-medium text-gray-800">
                    {parsedData.partnerName || parsedData.issuerName || "-"} 
                    {parsedData.partnerCode ? ` (CD: ${parsedData.partnerCode})` : ""}
                  </span>
                </div>
                <div className="flex border-b pb-2 text-sm">
                  <span className="w-32 font-bold text-gray-600">計上日 / 発注日</span>
                  <span className="font-medium text-gray-800">{parsedData.date || "-"}</span>
                </div>
                {expectedPayDate && (
                  <div className="flex border-b pb-2 text-sm bg-amber-50/60 p-2 rounded">
                    <span className="w-32 font-bold text-amber-900">入金予定日</span>
                    <span className="font-bold text-amber-950">{expectedPayDate}（計上日の翌月末）</span>
                  </div>
                )}
                {parsedData.deliveryDate && (
                  <div className="flex border-b pb-2 text-sm">
                    <span className="w-32 font-bold text-gray-600">希望納期</span>
                    <span className="font-medium text-gray-800">{parsedData.deliveryDate}</span>
                  </div>
                )}

                {/* 明細（商品名一覧） */}
                {items && items.length > 0 ? (
                  <div className="mt-4 pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-gray-700">商品明細（全 {items.length} 件）</h3>
                    </div>
                    <div className="overflow-x-auto border rounded">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b text-gray-600">
                          <tr>
                            <th className="p-2">#</th>
                            {items.some((i: any) => i.orderNumber) && (
                              <th className="p-2">購買NO</th>
                            )}
                            {items.some((i: any) => i.acceptanceDate) && (
                              <th className="p-2">検収日</th>
                            )}
                            <th className="p-2">商品名（品名）</th>
                            <th className="p-2 text-right">数量</th>
                            <th className="p-2 text-right">単価</th>
                            {items.some((i: any) => i.discountAmount) && (
                              <th className="p-2 text-right">値引</th>
                            )}
                            <th className="p-2 text-right">金額合計</th>
                            {items.some((i: any) => i.estimateNo) && (
                              <th className="p-2 text-center">見積No</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {items.map((item: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-2 text-gray-400">{i + 1}</td>
                              {items.some((it: any) => it.orderNumber) && (
                                <td className="p-2 font-mono font-medium text-blue-700 whitespace-nowrap">
                                  {item.orderNumber || "-"}
                                </td>
                              )}
                              {items.some((it: any) => it.acceptanceDate) && (
                                <td className="p-2 text-gray-600 whitespace-nowrap">
                                  {item.acceptanceDate || "-"}
                                </td>
                              )}
                              <td className="p-2 font-medium text-gray-800">{item.itemName || "-"}</td>
                              <td className="p-2 text-right text-gray-600 whitespace-nowrap">{item.quantity} {item.unit}</td>
                              <td className="p-2 text-right text-gray-600 whitespace-nowrap">{item.unitPrice ? `¥${Number(item.unitPrice).toLocaleString()}` : "-"}</td>
                              {items.some((it: any) => it.discountAmount) && (
                                <td className="p-2 text-right text-red-600 whitespace-nowrap">
                                  {item.discountAmount ? `¥${Number(item.discountAmount).toLocaleString()}` : "-"}
                                </td>
                              )}
                              <td className="p-2 text-right font-medium text-emerald-800 whitespace-nowrap">{item.amount ? `¥${Number(item.amount).toLocaleString()}` : "-"}</td>
                              {items.some((it: any) => it.estimateNo) && (
                                <td className="p-2 text-center text-blue-700 whitespace-nowrap">{item.estimateNo || "-"}</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex border-b pb-2 text-sm">
                    <span className="w-32 font-bold text-gray-600">商品名</span>
                    <span className="font-medium text-gray-800">{parsedData.itemName || "-"}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 py-8 text-center">解析データがありません。</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">元ファイルプレビュー</h2>
            {fileExists && (
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                別ウィンドウで開く
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div className="bg-gray-100 rounded-lg border h-[600px] flex items-center justify-center overflow-hidden">
            {!fileExists ? (
              <div className="text-center p-8 max-w-sm">
                <FileWarning className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800 mb-1">ファイルが見つかりません</h3>
                <p className="text-xs text-gray-500 mb-2">
                  サーバー上または共有フォルダ（\\eggplant\share\...）に実ファイルが存在しないか、別環境のデータです。
                </p>
                <div className="text-xs text-gray-400 bg-gray-200/70 p-2 rounded break-all">
                  {data.fileName || data.fileUrl}
                </div>
              </div>
            ) : data.fileName?.toLowerCase().endsWith('.pdf') || data.fileUrl?.toLowerCase().endsWith('.pdf') ? (
              <iframe src={previewUrl} className="w-full h-full rounded-lg" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain p-2" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
