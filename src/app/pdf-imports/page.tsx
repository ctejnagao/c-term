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
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700"
        >
          ファイルを選択
        </label>
        {file && (
          <div className="mt-4 text-sm text-gray-600">
            選択中: {file.name}
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="px-8 py-3 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? "AI解析中..." : "アップロードして自動解析を実行"}
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-3">
            {result.success ? <CheckCircle className="text-green-600 mt-1" /> : <AlertCircle className="text-red-600 mt-1" />}
            <div>
              <h3 className={`font-bold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? "解析完了" : "エラー発生"}
              </h3>
              {result.success ? (
                <div className="text-sm mt-2 space-y-2">
                  <p>ファイル: {result.data?.fileName}</p>
                  <p>種別: {result.parsedData?.type}</p>
                  {result.createdOrder && (
                    <p>
                      <span className="font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        発注データ（{result.createdOrder.orderNumber}）を自動生成しました
                      </span>
                    </p>
                  )}
                  <div className="mt-4">
                    <Link href={`/pdf-imports/${result.data?.id}`} className="text-blue-600 hover:underline">
                      詳細を確認する &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600 mt-1">{result.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">過去の取込履歴</h2>
        <div className="bg-white border rounded overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 font-medium text-gray-600">取込日時</th>
                <th className="p-3 font-medium text-gray-600">ファイル名</th>
                <th className="p-3 font-medium text-gray-600">ステータス</th>
                <th className="p-3 font-medium text-gray-600">詳細</th>
              </tr>
            </thead>
            <tbody>
              {imports.length > 0 ? (
                imports.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="p-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      {item.fileName}
                    </td>
                    <td className="p-3">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link href={`/pdf-imports/${item.id}`} className="text-blue-600 hover:underline">
                        表示
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">
                    履歴はありません。APIから一覧を取得する処理を実装してください。
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
