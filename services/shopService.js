import { Shop, Product, Category, Package } from '../models/index.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { DateTime } from "luxon";
import CustomErrorHandler from '../helpers/CustomErrorHandler.js';
const ShopService = {

    async addShop(data) {
        const userInfo = global.user;
        let shopImg = [];
        if (data.shopImage && data.shopImage.length > 0) {
            for (let images of data.shopImage) {
                // const ImageUrl=await ImageUploader.ImageUploader(images,"ShopImages");
                // shopImg.push(ImageUrl);
                shopImg.push(images);
            }
        }
        const shopTiming = {
            Monday: {
                isOpen: data.shopTiming.Monday.isOpen,
                openTime: data.shopTiming.Monday.openTime || null,
                closeTime: data.shopTiming.Monday.closeTime || null,
            },
            Tuesday: {
                isOpen: data.shopTiming.Tuesday.isOpen,
                openTime: data.shopTiming.Tuesday.openTime || null,
                closeTime: data.shopTiming.Tuesday.closeTime || null,
            },
            Wednesday: {
                isOpen: data.shopTiming.Wednesday.isOpen,
                openTime: data.shopTiming.Wednesday.openTime || null,
                closeTime: data.shopTiming.Wednesday.closeTime || null,
            },
            Thursday: {
                isOpen: data.shopTiming.Thursday.isOpen,
                openTime: data.shopTiming.Thursday.openTime || null,
                closeTime: data.shopTiming.Thursday.closeTime || null,
            },
            Friday: {
                isOpen: data.shopTiming.Friday.isOpen,
                openTime: data.shopTiming.Friday.openTime || null,
                closeTime: data.shopTiming.Friday.closeTime || null,
            },
            Saturday: {
                isOpen: data.shopTiming.Saturday.isOpen,
                openTime: data.shopTiming.Saturday.openTime || null,
                closeTime: data.shopTiming.Saturday.closeTime || null,
            },
            Sunday: {
                isOpen: data.shopTiming.Sunday.isOpen,
                openTime: data.shopTiming.Sunday.openTime || null,
                closeTime: data.shopTiming.Sunday.closeTime || null,
            },
        };

        console.log("The got datetime:", data.joinedAt);
        const formatDateTime = (dateTimeString) => {
            const parsedDate = DateTime.fromISO(dateTimeString, { zone: "utc" });
            if (!parsedDate.isValid) {
                throw CustomErrorHandler.badRequest("Invalid date format. Please provide a valid ISO string.");
            }

            return parsedDate.toISO();
        };


        const standardizedDateTime = formatDateTime(data.joinedAt);
        const newShop = new Shop({
            shopImage: shopImg,
            shopName: data.shopName,
            shopDescription: data.shopDescription,
            shopAddress: data.shopAddress,
            locationHistory: {
                point: {
                    type: "Point",
                    coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
                    selectLocation: data.selectLocation,
                },

            },
            shopContact: data.shopContact,
            shopEmail: data.shopEmail,
            shopLink: data.shoplink || null,
            shopTiming: shopTiming,
            LicenseNumber: data.LicenseNumber,
            gstNumber: data.gstNumber,
            ownerName: data.ownerName,
            ownerPhoneNumber: data.ownerPhoneNumber,
            ownerEmail: data.ownerEmail,
            ownerAddress: data.ownerAddress,
            ownerAddharImages: {
                aadharFrontSide: data.aadharFrontSide,
                aadharBackSide: data.aadharBackSide
            },
            ownerPanNumber: data.ownerPanNumber,
            userId: userInfo.userId,
            joinedAt: standardizedDateTime,
            isSubscriptionPurchased: false
        });
        try {
            const result = await newShop.save();
            return result;
        } catch (err) {
            console.log("Error in adding shop:", err);
        }
    },

    async getMyShop() {
        try {
            const userinfo = global.user;
            const shop = await Shop.find({ userId: userinfo.userId }, {
                updatedAt: 0,
                createdAt: 0,
                __v: 0,
            }).populate('packageId');
            return shop;
        } catch (err) {
            console.log("Error in getting my shop:", err);
        }
    },
    async getNearbyShop(data) {
        const { latitude, longitude } = data;
        const MAX_DISTANCE_METERS = 15 * 1000;

        const userLocation = {
            type: "Point",
            coordinates: [longitude, latitude]
        };

        // Find shops with expired subscriptions within the defined radius
        const expiredShops = await Shop.find({
            "locationHistory.point": {
                $near: {
                    $geometry: userLocation,
                    $maxDistance: MAX_DISTANCE_METERS
                }
            },
            packageEndDate: { $lt: new Date() },
            isSubscriptionPurchased: true
        }).select('_id');

        // Update the subscription status of expired shops
        if (expiredShops.length > 0) {
            const expiredShopIds = expiredShops.map(shop => shop._id);
            await Shop.updateMany(
                { _id: { $in: expiredShopIds } },
                { $set: { isSubscriptionPurchased: false } }
            );
        }

        // Aggregate nearby shops with active subscriptions
        const nearbyShops = await Shop.aggregate([
            {
                $geoNear: {
                    near: userLocation,
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: MAX_DISTANCE_METERS
                }
            },
            {
                $addFields: {
                    distanceInKm: { $divide: ["$distance", 1000] }
                }
            },
            {
                $match: {
                    distanceInKm: { $lte: 15 },
                    isSubscriptionPurchased: true
                }
            },
            {
                $lookup: {
                    from: "packages",
                    localField: "packageId",
                    foreignField: "_id",
                    as: "packageId"
                }
            },
            {
                $unwind: {
                    path: "$packageId",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        return nearbyShops;
    },

    async AddProduct(data) {
        const { productsImage, productName, productsDescription, productsPrice,
            productCategory, productSubCategory, productBrand, shopId, discountedvalue, discounttype } = data;
        let imagesUrl = [];
        // if (productsImage && productsImage.length > 0) {
        //     for (image in productsImage) {
        //         // const uploadedImage = await ImageUploader.Upload(image, "Product");
        //         // imagesUrl.push(uploadedImage);
        //         imagesUrl.push(image);
        //     }
        // }

        const finalDiscount = {
            discountedvalue: discounttype === 'fixed' ? 0 : discountedvalue,
            discounttype: discounttype.toLowerCase() === 'fixed' ? 'fixed' : 'percent'
        };
        const product = new Product({
            productsImage: productsImage,
            productName: productName,
            productsDescription: productsDescription,
            productsPrice: productsPrice,
            productCategory: productCategory,
            productSubCategory: productSubCategory,
            productBrand: productBrand,
            productDiscount: finalDiscount,
            shopId: shopId,
            isActive: true
        })
        try {
            const result = await product.save()
            return result;
        } catch (err) {
            console.log("Failed to add Product: ", err);
        }

    },

    async getShopProduct(data) {
        try {
            const shop = await Shop.findById(data.shopId);
            if (!shop) {
                return CustomErrorHandler.notFound("The specified shop is not available.");
            }
            const product = await Product.find({
                shopId: shop._id
            });
            return product;
        } catch (error) {
            console.log("Failed to get Shop Products", error);
        }
    },

    async setProductActiveStatus(data) {
        try {

            const product = await Product.findById(data.productId);
            if (!product) {
                return CustomErrorHandler.notFound("The specified product is not available.");
            }
            product.isActive = !data.isActive;

            await product.save();
            return product;
        } catch (error) {
            console.error('Error updating product status:', error);
        }
    },


    //here we are using levenshteinDistance alogrithm to correct the incorrect query provided by user
    async correctIncorrectQuery(source, target) {
        const matrix = [];

        // Initialize matrix
        for (let i = 0; i <= target.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= source.length; j++) {
            matrix[0][j] = j;
        }
        // Populate matrix using Levenshtein distance
        for (let i = 1; i <= target.length; i++) {
            for (let j = 1; j <= source.length; j++) {
                if (target.charAt(i - 1) === source.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                }
            }
        }
        return matrix[target.length][source.length];
    },

    async searchShopsAndProducts(query) {
        try {
            //first we well try to find the orginal query result or partially match result 
            const originalQueryRegex = new RegExp(query, 'i');

            // Find any shops or products matching the original query
            const initialShops = await Shop.find({
                $or: [
                    { shopName: originalQueryRegex },
                    { shopDescription: originalQueryRegex },
                    { shopAddress: originalQueryRegex },
                ]
            }).populate('packageId');

            const initialProducts = await Product.find({
                $or: [
                    { productName: originalQueryRegex },
                    { productsDescription: originalQueryRegex },
                    { productCategory: originalQueryRegex },
                    { productSubCategory: originalQueryRegex },
                    { productBrand: originalQueryRegex },
                ]
            });

            /* If we find the result based on the user orginal query there is no 
            need for us to do spell correction such that we return the original result */

            if (initialShops.length > 0 || initialProducts.length > 0) {
                const shops = await Shop.find({
                    $or: [
                        { shopName: originalQueryRegex },
                        { shopDescription: originalQueryRegex },
                        { shopAddress: originalQueryRegex },
                    ]
                }).populate('packageId');

                const products = await Product.find({
                    $or: [
                        { productName: originalQueryRegex },
                        { productsDescription: originalQueryRegex },
                        { productCategory: originalQueryRegex },
                        { productSubCategory: originalQueryRegex },
                        { productBrand: originalQueryRegex },
                    ]
                });

                return { shops, products, didYouMean: null, originalQuery: query, correctedQuery: null };
            }

            /* if we dont find the result based on user orginal text wheater the query text is incorret
            we will do an spell correction to find the result using correct query
            Lets get the relevant field from database that might contain the search term */

            const [
                categories,
                subCategories,
                brands,
                productNames,
                shopNames,
                productDescriptionTerms
            ] = await Promise.all([
                Category.distinct('categoryItem'),
                Product.distinct('productSubCategory'),
                Product.distinct('productBrand'),
                Product.distinct('productName'),
                Shop.distinct('shopName'),
                Product.find({}, { productsDescription: 1 }).limit(100)
            ]);

            // Extract and filter meaningful words from product descriptions
            const descriptionWords = [];
            productDescriptionTerms.forEach(product => {
                if (product.productsDescription) {
                    // Split description and filter out short words and common stop words
                    const words = product.productsDescription
                        .split(/\s+/)
                        .filter(word =>
                            word.length > 3 &&
                            !/^(the|and|for|with|this|that|from|have|has|are|not)$/i.test(word)
                        );
                    descriptionWords.push(...words);
                }
            });

            // Create a single array of all potential search terms from the database
            const potentialTerms = [
                ...(Array.isArray(categories) ? categories.flat() : []),
                ...(Array.isArray(subCategories) ? subCategories : []),
                ...(Array.isArray(brands) ? brands : []),
                ...(Array.isArray(productNames) ? productNames : []),
                ...(Array.isArray(shopNames) ? shopNames : []),
                ...descriptionWords
            ];

            // Process and  clean up, filter short words, deduplicate terms
            const processedTerms = [...new Set(
                potentialTerms
                    .filter(term => term && typeof term === 'string')
                    .map(term => term.toLowerCase().trim())
                    .filter(term => term.length > 2) // Only consider terms with at least 3 characters
            )];
            // Attempt spelling correction for each word in the query
            const queryWords = query.toLowerCase().trim().split(/\s+/);
            // For each query word, find the best spelling suggestion
            const suggestions = [];
            for (const word of queryWords) {
                if (word.length <= 2) {
                    suggestions.push(word);
                    continue;
                }

                let bestMatch = word;
                let minDistance = Infinity;

                for (const term of processedTerms) {
                    // Only consider terms that are somewhat similar in length to the query word
                    if (Math.abs(term.length - word.length) > Math.min(3, word.length / 2)) {
                        continue;
                    }
                    const distance = await ShopService.correctIncorrectQuery(word, term);
                    const normalizedDistance = distance / Math.max(word.length, term.length);
                    // Consider a term as a potential match if it's similar enough
                    if (normalizedDistance < 0.4 && distance < minDistance) {
                        bestMatch = term;
                        minDistance = distance;
                    }
                }

                suggestions.push(bestMatch);
            }

            // Only accept the suggestion if it's different from the original query
            const suggestedQuery = suggestions.join(' ');
            const didYouMean = suggestedQuery !== query.toLowerCase().trim() ? suggestedQuery : null;

            const searchQuery = didYouMean || query;
            const searchQueryRegex = new RegExp(searchQuery, 'i');
            const shops = await Shop.find({
                $or: [
                    { shopName: searchQueryRegex },
                    { shopDescription: searchQueryRegex },
                    { shopAddress: searchQueryRegex },
                ]
            }).populate('packageId');

            const products = await Product.find({
                $or: [
                    { productName: searchQueryRegex },
                    { productsDescription: searchQueryRegex },
                    { productCategory: searchQueryRegex },
                    { productSubCategory: searchQueryRegex },
                    { productBrand: searchQueryRegex },
                ]
            });

            return {
                shops,
                products,
                didYouMean,
                originalQuery: query,
                correctedQuery: didYouMean !== null ? suggestedQuery : null
            };
        } catch (err) {
            console.error("Error in searching shops and products:", err);
            throw new Error("Error in search operation");
        }
    },



    async getSpecificProduct(data) {

        try {
            const product = await Product.findById(data.productId).populate('shopId');
            if (!product) {
                return CustomErrorHandler.notFound("Product not found.");
            }
            return product;
        } catch (error) {
            console.log("Unable to fetch specific product:", error);
        }
    },

    async addCategory(data) {

        const { categoryfor, items } = data;
        const isCategoryExist = await Category.findOne({ categoryFor: categoryfor });
        if (isCategoryExist) {
            const updatedCategoryitem = await Category.updateOne(
                { categoryFor: categoryfor },
                { $addToSet: { categoryItem: { $each: items } } }
            );
            if (updatedCategoryitem.modifiedCount > 0) {
                const category = await Category.findOne({ categoryFor: categoryfor });
                return {
                    success: true,
                    message: "Category updated successfully with new items",
                    data: category
                };
            }
        } else {
            const category = new Category({
                categoryFor: categoryfor,
                categoryItem: items
            });
            const result = await category.save();
            return result;
        }
    },
    async getCategory() {
        try {
            const categories = await Category.find(
                { categoryFor: "Sports" },
                {
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0
                }
            );
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

    async getSubCategory(data) {
        const category = data.category;
        const subCategory = await Category.find({
            categoryFor: `${category} sub`
        }, {
            createdAt: 0,
            updatedAt: 0,
            __v: 0
        })
        if (subCategory) {
            return subCategory[0].categoryItem;
        } else {
            return [];
        }
    },
    async getBrand() {
        try {
            const categories = await Category.find(
                { categoryFor: "Sports_Brand" },
                {
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0
                }
            );
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
    async setProductDiscount(data) {
        const { productId, discount } = data;

        try {
            const product = await Product.findById(productId);
            if (!product) {
                return CustomErrorHandler.notFound("Product not found.");
            }

            product.productDiscount = {
                value: discount.value,
                type: discount.type,
            };

            await product.save();
            return product;
        } catch (err) {
            console.error("Error in setting product discount:", err);
            throw err;
        }
    },
    async updateSubscriptionStatus(data) {
        try {
            const shop = await Shop.findById(data.shopId);
            if (!shop) {
                return CustomErrorHandler.notFound("Shop Not Found");
            }
            shop.packageId = data.packageId;
            shop.packageStartDate = data.packageStartDate;
            shop.packageEndDate = data.packageEndDate;
            shop.isSubscriptionPurchased = true;

            shop.save();
            return shop;
        } catch (error) {
            console.log("Failed to update Subscription Status:", error);
        }

    },
}
export default ShopService;