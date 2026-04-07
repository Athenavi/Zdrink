import apiClient from '@/lib/api';

export interface PointsLog {
    id: number;
    points_type: string;
    points: number;
    current_points: number;
    notes: string;
    reference_id?: string;
    created_at: string;
}

export interface MembershipInfo {
    level_name: string;
    available_points: number;
    total_points: number;
    next_level_points: number;
    membership_level: number;
}

export const pointsApi = {
    // 获取积分记录
    getPointsLogs(params?: { page?: number; page_size?: number }) {
        return apiClient.get<{ results: PointsLog[]; count: number }>('/users/points/logs/', {params});
    },

    // 获取会员信息
    getMembershipInfo() {
        return apiClient.get<MembershipInfo>('/users/profile/membership/');
    },

    // 签到获得积分
    signinEarnPoints() {
        return apiClient.post<{
            message: string;
            points_earned: number;
            current_points: number;
        }>('/users/points/signin/');
    },

    // 消费积分
    consumePoints(data: { points: number; order_id?: number }) {
        return apiClient.post<{
            message: string;
            current_points: number;
        }>('/users/points/consume/', data);
    }
};
