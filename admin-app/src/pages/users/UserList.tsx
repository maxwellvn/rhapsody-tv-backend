import MainLayout from '@/components/layout/MainLayout';
import CreateUserForm from '@/components/users/CreateUserForm';
import UsersTable from '@/components/users/UsersTable';

const UserList = () => {
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-2">
          Users
        </h1>
        <p className="text-sm md:text-base text-[#666666]">
          Manage user accounts and profiles
        </p>
      </div>

      <CreateUserForm />
      <UsersTable />
    </MainLayout>
  );
};

export default UserList;
