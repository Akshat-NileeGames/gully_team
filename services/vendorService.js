// vendorService.js
import Vendor from '../models/vendor.js';
import CustomErrorHandler from '../helpers/CustomErrorHandler.js';
import mongoose from 'mongoose';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/vendors'; // Update URL as needed

export const createVendor = async (vendorData) => {
    try {
        return await Vendor.create(vendorData);
    } catch (error) {
        console.error('Vendor creation error:', error);
        if (error.name === 'ValidationError') {
            throw CustomErrorHandler.badRequest(`Validation error: ${error.message}`);
        }
        throw CustomErrorHandler.serverError(`Database error during vendor creation: ${error.message}`);
    }
};

export const getAllVendors = async () => { //search query as a parameter and if search is null then all data will be fetched and all data instaed req.body query string
    try {
        return await Vendor.find({ isVendorDeleted: false }).populate('userId');
    } catch (error) {
        throw CustomErrorHandler.serverError('Database error during fetching vendors');
    }
};

export const getVendorById = async (id) => {
    try {
        return await Vendor.findById(id).populate('userId');
    } catch (error) {
        throw CustomErrorHandler.serverError('Database error during fetching vendor');
    }
};

export const updateVendor = async (id, data) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw CustomErrorHandler.badRequest('Invalid vendor ID format');
    }

    try {
        const result = await Vendor.findByIdAndUpdate(id, data, { new: true });
        if (!result) {
            throw CustomErrorHandler.notFound('Vendor not found');
        }
        return result;
    } catch (error) {
        console.error('Detailed error during vendor update:', error.message, error.stack); // Log the specific error
        throw CustomErrorHandler.serverError('Database error during vendor update');
    }
};


export const deleteVendorById = async (id) => {
    try {
        const vendor = await Vendor.findById(id);
        if (!vendor) throw CustomErrorHandler.notFound('Vendor not found');

        vendor.isVendorDeleted = true; // Soft delete logic
        vendor.deletedAt = new Date(); // Set the deletion timestamp
        return await vendor.save(); // Save the updated vendor
    } catch (error) {
        throw CustomErrorHandler.serverError('Database error during vendor deletion');
    }
};

// export const getUnverifiedVendors = async () => {
//     try {
//         const response = await axios.get(`${API_URL}?isvendorVerified=false`);
//         return response.data.data.vendors;
//     } catch (error) {
//         console.error("Error fetching vendors:", error);
//     }
// };

// export const verifyVendor = async (vendorId) => {
//     try {
//         return await axios.put(`${API_URL}/${vendorId}/verify`);
//     } catch (error) {
//         console.error("Error verifying vendor:", error);
//     }
// };

// export const rejectVendor = async (vendorId) => {
//     try {
//         return await axios.put(`${API_URL}/${vendorId}/reject`);
//     } catch (error) {
//         console.error("Error rejecting vendor:", error);
//     }
// };
// Exporting all functions at once
export default {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    deleteVendorById,
    // getUnverifiedVendors,
    // verifyVendor,
    // rejectVendor
};
