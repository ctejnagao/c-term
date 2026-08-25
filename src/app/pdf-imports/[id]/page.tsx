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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/pdf-imports" className="flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" />
          一覧に戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">取込詳細: {data.fileName}</h1>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">AI抽出データ</h2>
          <div className="bg-white p-6 rounded shadow border">
            {parsedData ? (
              <div className="space-y-4">
                <div className="flex border-b pb-2">
                  <span className="w-32 font-bold text-gray-600">種類</span>
                  <span>{parsedData.type}</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="w-32 font-bold text-gray-600">取引先</span>
                  <span>{parsedData.partnerName} (CD: {parsedData.partnerCode})</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="w-32 font-bold text-gray-600">書類番号</span>
                  <span>{parsedData.documentNumber}</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="w-32 font-bold text-gray-600">日付</span>
                  <span>{parsedData.date}</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="w-32 font-bold text-gray-600">合計金額</span>
                  <span>&yen;{Number(parsedData.totalAmount).toLocaleString()}</span>
                </div>

                {parsedData.items && parsedData.items.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-bold mb-2">明細</h3>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-y">
                        <tr>
                          <th className="p-2 text-left">品名</th>
                          <th className="p-2 text-right">数量</th>
                          <th className="p-2 text-right">単価</th>
                          <th className="p-2 text-right">金額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.items.map((item: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{item.itemName}</td>
                            <td className="p-2 text-right">{item.quantity} {item.unit}</td>
                            <td className="p-2 text-right">{Number(item.unitPrice).toLocaleString()}</td>
                            <td className="p-2 text-right">{Number(item.amount).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">解析データがありません。</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">元ファイルプレビュー</h2>
          <div className="bg-gray-100 rounded border h-[600px] flex items-center justify-center">
            {data.fileUrl?.endsWith('.pdf') ? (
              <iframe src={data.fileUrl} className="w-full h-full rounded" />
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
