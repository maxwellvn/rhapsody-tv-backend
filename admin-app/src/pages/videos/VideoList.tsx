import MainLayout from '@/components/layout/MainLayout';
import CreateVideoForm from '@/components/videos/CreateVideoForm';
import VideosTable from '@/components/videos/VideosTable';

const VideoList = () => {
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-2">
          Videos
        </h1>
        <p className="text-sm md:text-base text-[#666666]">
          Manage video content library
        </p>
      </div>

      <CreateVideoForm />
      <VideosTable />
    </MainLayout>
  );
};

export default VideoList;
