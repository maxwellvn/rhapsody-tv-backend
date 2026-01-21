import MainLayout from '@/components/layout/MainLayout';
import CreateProgramForm from '@/components/programs/CreateProgramForm';
import ProgramsTable from '@/components/programs/ProgramsTable';

const ProgramList = () => {
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-2">
          Programs
        </h1>
        <p className="text-sm md:text-base text-[#666666]">
          Manage program schedules
        </p>
      </div>

      <CreateProgramForm />
      <ProgramsTable />
    </MainLayout>
  );
};

export default ProgramList;
