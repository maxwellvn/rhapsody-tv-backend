import MainLayout from '@/components/layout/MainLayout';
import CreateChannelForm from '@/components/channels/CreateChannelForm';
import ChannelsTable from '@/components/channels/ChannelsTable';

const ChannelList = () => {
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-2">
          Channels
        </h1>
        <p className="text-sm md:text-base text-[#666666]">
          Manage TV channels and content
        </p>
      </div>

      <CreateChannelForm />
      <ChannelsTable />
    </MainLayout>
  );
};

export default ChannelList;
