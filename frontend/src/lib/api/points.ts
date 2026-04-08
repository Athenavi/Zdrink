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

export interface MembershipLevelInfo {
    name: string;
    discount_rate: number;
    points_earn_rate: number;
    benefits: {
        description: string;
        items: string[];
        icon: string;
        color: string;
    };
    min_points: number;
}

export interface NextLevelInfo {
    level: string;
    name: string;
    min_points: number;
    points_needed: number;
    discount_rate: number;
    points_earn_rate: number;
    benefits: {
        description: string;
        items: string[];
        icon: string;
        color: string;
    };
}

export interface MembershipInfo {
    id: number;
    username: string;
    membership_level: string;
    membership_level_name: string;
    membership_number: string;
    total_points: number;
    available_points: number;
    used_points: number;
    total_consumption: number;
    consumption_count: number;
    referral_code: string;
    level_info: MembershipLevelInfo | null;
    next_level_info: NextLevelInfo | null;
    has_signed_in_today: boolean;
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
