const ProviderServices = {
    
    async GetServiceType() {
        try {
            const categories = await Category.find(
                { categoryFor: "service_type" },
                {
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0
                }
            );
            console.log(categories);
            if (categories) {
                return categories[0].categoryItem;
            } else {
                return [];
            }
        } catch (error) {
            console.error("Error in getting category:", error);
            return [];
        }
    },
}
export default ProviderServices;