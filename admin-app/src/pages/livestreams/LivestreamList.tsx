import MainLayout from '@/components/layout/MainLayout';
import CreateLivestreamForm from '@/components/livestreams/CreateLivestreamForm';
import LivestreamsTable from '@/components/livestreams/LivestreamsTable';

const LivestreamList = () => {
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-2">
          Livestreams
        </h1>
        <p className="text-sm md:text-base text-[#666666]">
          Manage live streaming content
        </p>
      </div>

      <CreateLivestreamForm />
      <LivestreamsTable />
    </MainLayout>
  );
};

export default LivestreamList;
