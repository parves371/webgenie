interface props {
  params: Promise<{
    projectId: string;
  }>;
}

const page = async ({ params }: props) => {
  const { projectId } = await params;
  return <div>page</div>;
};

export default page;
