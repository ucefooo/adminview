"use client";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import JSZip from "jszip";

interface ResultItem {
  id: string;
  image: string;
  results: string;
}

const HomePage = () => {
  const [positiveResults, setPositiveResults] = useState<ResultItem[]>([]);
  const [negativeResults, setNegativeResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [positiveResponse, negativeResponse] = await Promise.all([
        supabase.from("ResultsPositive").select("image,results,id"),
        supabase.from("ResultsNegative").select("image,results,id"),
      ]);

      if (positiveResponse.data) setPositiveResults(positiveResponse.data);
      if (negativeResponse.data) setNegativeResults(negativeResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/login");
    } catch (error) {
      if (error instanceof Error)
        console.error("Error signing out:", error.message);
    }
  };

  const downloadAllImages = async (bucketName:string) => {
    try {
      const { data: fileList, error: listError } = await supabase.storage
        .from(bucketName)
        .list();

      if (listError) {
        console.error("Error fetching file list:", listError);
        return;
      }

      if (!fileList || fileList.length === 0) {
        console.log("No files found in storage");
        return;
      }

      const zip = new JSZip();

      const downloadPromises = fileList.map(async (file) => {
        try {
          const { data, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(file.name);

          if (downloadError) {
            console.error(`Error downloading ${file.name}:`, downloadError);
            return;
          }

          if (!data) {
            console.error(`No data received for ${file.name}`);
            return;
          }
          zip.file(file.name + ".jpeg", data);
          return {
            success: true,
            fileName: file.name + ".jpeg",
          };
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          return {
            success: false,
            fileName: file.name,
            error: err,
          };
        }
      });
      const results = await Promise.all(downloadPromises);
      const timestamp = new Date().toISOString().split("T")[0];
      const successfulDownloads = results
        .filter((r) => r?.success)
        .map((r) => r?.fileName);
      const failedDownloads = results
        .filter((r) => !r?.success)
        .map((r) => r?.fileName);

      const summaryContent = `Download Summary (${timestamp})
  Successfully downloaded files:
  ${successfulDownloads.join("\n")}
  
  Failed downloads:
  ${failedDownloads.join("\n")}`;

      zip.file("download-summary.txt", summaryContent);

      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photos-${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        totalFiles: fileList.length,
        successfulDownloads: successfulDownloads.length,
        failedDownloads: failedDownloads.length,
      };
    } catch (error) {
      console.error("Error in bulk download:", error);
      return {
        success: false,
        error: error,
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 relative">
          <div className="absolute right-0 top-0">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors top:10"
            >
              Sign Out
            </button>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Image Database Results
          </h1>
          <div className="text-lg text-gray-600">
            Total Images: {positiveResults.length + negativeResults.length}
          </div>
          <div className="flex justify-center gap-6 p-2">
            <button
              onClick={() =>
                downloadAllImages('Photos')
              }
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              Download Positive Results
            </button>
            <button
              onClick={() =>
                downloadAllImages('negative')
              }
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Download Negative Results
            </button>
          </div>
        </div>

        {/* Positive Results Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Positive Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positiveResults.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="aspect-w-16 aspect-h-9">
                  <Image
                    src={item.image}
                    alt={`Positive result ${item.id}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority
                  />
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium text-green-600 mb-2">
                    Positive Result:
                  </div>
                  <div className="text-gray-700">{item.results}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Negative Results Section */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Negative Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {negativeResults.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="relative aspect-w-16 aspect-h-9">
                  <Image
                    src={item.image}
                    alt={`Negative result ${item.id}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority
                  />
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium text-red-600 mb-2">
                    Negative Result:
                  </div>
                  <div className="text-gray-700">{item.results}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
