import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default async function PdfImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  
  if (isNaN(id)) return notFound();

  const data = await prisma.pdfImport.findUnique({
    where: { id },
  });

  if (!data) return notFound();

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
                    <span className="text-xs font-bold text-indigo-700 block">購買No (発注No)</span>
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
                  <span className="w-32 font-bold text-gray-600">種類</span>
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
                  <span className="w-32 font-bold text-gray-600">日付</span>
                  <span className="font-medium text-gray-800">{parsedData.date || "-"}</span>
                </div>
                {parsedData.deliveryDate && (
                  <div className="flex border-b pb-2 text-sm">
                    <span className="w-32 font-bold text-gray-600">希望納期</span>
                    <span className="font-medium text-gray-800">{parsedData.deliveryDate}</span>
                  </div>
                )}

                {/* 明細（商品名一覧） */}
                {items && items.length > 0 ? (
                  <div className="mt-4 pt-2">
                    <h3 className="font-bold text-sm text-gray-700 mb-2">商品明細</h3>
                    <div className="overflow-x-auto border rounded">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b text-gray-600">
                          <tr>
                            <th className="p-2">商品名（品名）</th>
                            <th className="p-2 text-right">数量</th>
                            <th className="p-2 text-right">単価</th>
                            <th className="p-2 text-right">税抜金額</th>
                            {items.some((i: any) => i.estimateNo) && (
                              <th className="p-2 text-center">見積No</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {items.map((item: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-2 font-medium text-gray-800">{item.itemName || "-"}</td>
                              <td className="p-2 text-right text-gray-600 whitespace-nowrap">{item.quantity} {item.unit}</td>
                              <td className="p-2 text-right text-gray-600 whitespace-nowrap">{item.unitPrice ? `¥${Number(item.unitPrice).toLocaleString()}` : "-"}</td>
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
            {data.fileUrl && (
              <a 
                href={data.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-blue-600 hover:underline flex items-center"
              >
                別ウィンドウで開く
              </a>
            )}
          </div>
          <div className="bg-gray-100 rounded-lg border h-[600px] flex items-center justify-center overflow-hidden">
            {data.fileUrl?.endsWith('.pdf') ? (
              <iframe src={data.fileUrl} className="w-full h-full rounded-lg" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.fileUrl} alt="Preview" className="max-w-full max-h-full object-contain p-2" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
